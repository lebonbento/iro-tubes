// IRO 色 — le solveur.
//
// Il sert trois choses :
//   1. VALIDER un niveau engendré : sans lui, un mélange au hasard produit des
//      plateaux impossibles et le joueur s'acharne pour rien.
//   2. NOTER sa difficulté : le nombre de coups de la solution optimale.
//   3. SOUFFLER un coup au joueur (bouton « indice »).
//
// Deux moteurs : IDA* (optimal, pour les petits plateaux) et une exploration
// en profondeur avec mémoire (rapide, non optimale, pour prouver la solvabilité
// des grands plateaux). Les deux s'arrêtent sur un budget de nœuds : mieux vaut
// répondre « je ne sais pas » que bloquer la génération.

import { gagne, coupsPossibles, verser, cle, minorant } from './logique.js'

export const INCONNU = Symbol('budget épuisé')

/**
 * Cherche UNE solution, pas forcément la plus courte. Rapide même à 12 couleurs.
 * Renvoie la liste des coups, null si le plateau est prouvé insoluble, ou
 * INCONNU si le budget de nœuds est épuisé avant la conclusion.
 */
export function chercherUneSolution(etat, hauteur, budget = 400000) {
  const vus = new Set()
  const chemin = []
  let noeuds = 0
  let epuise = false

  const descendre = (courant) => {
    if (gagne(courant, hauteur)) return true
    if (noeuds++ > budget) {
      epuise = true
      return false
    }
    const k = cle(courant)
    if (vus.has(k)) return false
    vus.add(k)

    // On tente d'abord les coups qui rapprochent le plus du but : ça raccourcit
    // énormément la première branche explorée.
    const coups = coupsPossibles(courant, hauteur)
      .map((coup) => ({ coup, suivant: verser(courant, coup[0], coup[1], hauteur) }))
      .sort((a, b) => minorant(a.suivant) - minorant(b.suivant))

    for (const { coup, suivant } of coups) {
      chemin.push(coup)
      if (descendre(suivant)) return true
      chemin.pop()
      if (epuise) return false
    }
    return false
  }

  const trouve = descendre(etat)
  if (trouve) return chemin
  return epuise ? INCONNU : null
}

/**
 * Solution la plus courte, par approfondissement itératif sur f = g + minorant.
 * Renvoie les coups, null si insoluble, INCONNU si le budget est épuisé.
 */
export function chercherSolutionOptimale(etat, hauteur, budget = 1500000) {
  let noeuds = 0
  let epuise = false
  let plafond = minorant(etat)
  const chemin = []

  while (plafond <= 400) {
    let prochainPlafond = Infinity
    // Meilleur coût connu pour atteindre chaque état : élague les permutations.
    const vus = new Map()

    const descendre = (courant, g) => {
      const h = minorant(courant)
      const f = g + h
      if (f > plafond) {
        prochainPlafond = Math.min(prochainPlafond, f)
        return false
      }
      if (gagne(courant, hauteur)) return true
      if (noeuds++ > budget) {
        epuise = true
        return false
      }
      const k = cle(courant)
      const dejaVu = vus.get(k)
      if (dejaVu !== undefined && dejaVu <= g) return false
      vus.set(k, g)

      const coups = coupsPossibles(courant, hauteur)
        .map((coup) => ({ coup, suivant: verser(courant, coup[0], coup[1], hauteur) }))
        .sort((a, b) => minorant(a.suivant) - minorant(b.suivant))

      for (const { coup, suivant } of coups) {
        chemin.push(coup)
        if (descendre(suivant, g + 1)) return true
        chemin.pop()
        if (epuise) return false
      }
      return false
    }

    if (descendre(etat, 0)) return chemin
    if (epuise) return INCONNU
    if (prochainPlafond === Infinity) return null // aucun coup n'ouvre : insoluble
    plafond = prochainPlafond
  }
  return INCONNU
}

/**
 * Le coup à souffler au joueur depuis l'état courant. On vise l'optimal quand le
 * plateau est petit, sinon on se contente d'un coup qui mène à une victoire.
 */
export function indice(etat, hauteur) {
  const optimal = chercherSolutionOptimale(etat, hauteur, 250000)
  if (Array.isArray(optimal)) return optimal[0] ?? null
  const approx = chercherUneSolution(etat, hauteur, 250000)
  return Array.isArray(approx) ? (approx[0] ?? null) : null
}

/**
 * Recherche en faisceau : on avance en largeur mais on ne garde à chaque
 * profondeur que les `largeur` états les plus prometteurs.
 *
 * À quoi ça sert : au-delà de 5 unités par tube, prouver le minimum coûte des
 * dizaines de secondes et échoue souvent. La descente en profondeur, elle,
 * répond tout de suite mais rend des solutions très lâches — 90 coups là où le
 * minimum est 71. Le faisceau donne une solution presque optimale en une
 * seconde. C'est ce qui permet d'annoncer un objectif honnête sur les grands
 * plateaux, sans mentir en l'appelant « minimum ».
 */
export function chercherParFaisceau(etat, hauteur, largeur = 400, profondeurMax = 400) {
  // Les chemins sont reconstruits par chaînage arrière : les recopier à chaque
  // nœud ferait exploser la mémoire dès quelques milliers d'états.
  let faisceau = [{ etat, parent: null, coup: null }]
  const vus = new Set([cle(etat)])

  const remonter = (noeud) => {
    const chemin = []
    for (let n = noeud; n && n.coup; n = n.parent) chemin.push(n.coup)
    return chemin.reverse()
  }

  for (let profondeur = 0; profondeur < profondeurMax; profondeur++) {
    const candidats = []
    for (const noeud of faisceau) {
      for (const coup of coupsPossibles(noeud.etat, hauteur)) {
        const suivant = verser(noeud.etat, coup[0], coup[1], hauteur)
        const enfant = { etat: suivant, parent: noeud, coup }
        if (gagne(suivant, hauteur)) return remonter(enfant)
        const k = cle(suivant)
        if (vus.has(k)) continue
        vus.add(k)
        candidats.push({ enfant, score: minorant(suivant) })
      }
    }
    if (candidats.length === 0) return null
    candidats.sort((a, b) => a.score - b.score)
    faisceau = candidats.slice(0, largeur).map((c) => c.enfant)
  }
  return null
}
