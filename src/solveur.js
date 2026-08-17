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
