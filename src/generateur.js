// IRO 色 — fabrication des niveaux.
//
// Le piège classique du genre : mélanger au hasard et servir. Mesuré ici, un
// plateau tiré au hasard sur cinq est INSOLUBLE — le joueur s'acharnerait sur un
// mur. Aucun niveau ne sort d'ici sans être passé devant le solveur.
//
// Le tirage est déterministe (graine = numéro du niveau) : le niveau 42 est le
// même pour tout le monde, sur tous les appareils, sans serveur.
//
// Deux entrées :
//   fabriquerNiveau(n)   -> niveau de la campagne, avec son « par » prouvé.
//                           Coûteux (jusqu'à ~15 s), donc appelé au build.
//   fabriquerAleatoire() -> partie libre, validée par le seul moteur rapide.
//                           Quelques millisecondes, appelable dans le navigateur.

import { tubeFini, sommet, minorant, gagne } from './logique.js'
import { chercherUneSolution, chercherSolutionOptimale, chercherParFaisceau, INCONNU } from './solveur.js'

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function graine(n) {
  let a = (n + 0x6d2b79f5) >>> 0
  return function suivant() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Les réglages d'un niveau : la courbe de difficulté du jeu tient ici.
 *
 * Deux axes seulement, et c'est une contrainte MESURÉE, pas un choix de confort :
 * avec des tubes tous pleins au départ, ne laisser qu'un seul tube libre rend le
 * plateau insoluble dans 120 cas sur 120. Le « mode difficile à un tube » des
 * autres jeux suppose des tubes partiellement remplis — autre format. Ici la
 * difficulté monte par le NOMBRE DE COULEURS puis par la HAUTEUR des tubes.
 */
export function parametres(n) {
  // ⚠️ LES NIVEAUX 1 À 60 SONT GELÉS. Changer un seul de leurs réglages
  // changerait leur plateau, ce qui effacerait la progression des joueurs et
  // invaliderait les résultats déjà au classement. On n'ajoute qu'APRÈS.
  if (n <= 20) {
    // Apprentissage : 3 couleurs jusqu'à 12, tubes de 4.
    return { hauteur: 4, couleurs: Math.min(12, 3 + Math.floor((n - 1) / 2)), vides: 2, methode: 'melange' }
  }
  if (n <= 36) {
    // Les tubes s'allongent : mêmes couleurs, mais 5 unités à empiler.
    return { hauteur: 5, couleurs: Math.min(12, 10 + Math.floor((n - 21) / 6)), vides: 2, methode: 'melange' }
  }
  if (n <= 60) return { hauteur: 5, couleurs: 12, vides: 2, methode: 'melange' }

  // La difficulté repart par la HAUTEUR, seul axe qui monte encore : mesuré,
  // 12 couleurs donnent ~50 coups à 5 unités, ~61 à 6, ~71 à 7. Le nombre de
  // couleurs, lui, est plafonné à 12 par la palette (au-delà, deux teintes
  // deviennent indépartageables) et la hauteur par l'écran d'un iPhone SE.
  if (n <= 120) return { hauteur: 6, couleurs: 12, vides: 2, methode: 'melange' }
  if (n <= 200) return { hauteur: 7, couleurs: 12, vides: 2, methode: 'melange' }

  // Au-delà du 200, la difficulté ne monte plus — l'écran et la palette la
  // plafonnent. Ce qui continue, c'est la VARIÉTÉ : cinq formats en rotation,
  // dont deux que le tirage au hasard ne sait pas produire du tout (un seul
  // tube libre, tubes partiellement remplis), fabriqués en marche arrière.
  const formats = [
    { hauteur: 6, couleurs: 12, vides: 2, methode: 'melange' },
    { hauteur: 5, couleurs: 12, vides: 1, methode: 'arriere' },
    { hauteur: 7, couleurs: 12, vides: 2, methode: 'melange' },
    { hauteur: 6, couleurs: 12, vides: 1, methode: 'arriere' },
    { hauteur: 5, couleurs: 12, vides: 2, methode: 'melange' },
  ]
  return formats[(n - 201) % formats.length]
}

function melangerVers(unites, rand) {
  for (let i = unites.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[unites[i], unites[j]] = [unites[j], unites[i]]
  }
  return unites
}

/** Un plateau brut : chaque tube de couleur plein, puis les tubes libres. */
export function distribuer(couleurs, hauteur, vides, rand) {
  const unites = []
  for (let c = 0; c < couleurs; c++) for (let k = 0; k < hauteur; k++) unites.push(c)
  melangerVers(unites, rand)
  const etat = []
  for (let t = 0; t < couleurs; t++) etat.push(unites.slice(t * hauteur, (t + 1) * hauteur))
  for (let v = 0; v < vides; v++) etat.push([])
  return etat
}

/** Un tube déjà rangé au départ, c'est une couleur offerte : on n'en veut pas. */
const offert = (etat, hauteur) => etat.some((tube) => tube.length > 0 && tubeFini(tube, hauteur))

/**
 * Tire un plateau SOLUBLE, validé par le moteur rapide seul.
 * Renvoie { etat, longueurRapide } ou null si le tirage a échoué (rarissime).
 */
export function tirerPlateauSoluble(couleurs, hauteur, vides, rand, essais = 60) {
  for (let i = 0; i < essais; i++) {
    const etat = distribuer(couleurs, hauteur, vides, rand)
    if (offert(etat, hauteur)) continue
    const solution = chercherUneSolution(etat, hauteur, 300000)
    if (!Array.isArray(solution)) continue
    return { etat, longueurRapide: solution.length }
  }
  return null
}

/** Partie libre : un plateau jouable tout de suite, sans « par ». */
export function fabriquerAleatoire(couleurs, hauteur, vides, rand) {
  const tirage = tirerPlateauSoluble(couleurs, hauteur, vides, rand)
  if (!tirage) throw new Error('Aucun plateau soluble tiré')
  return { etat: tirage.etat, hauteur, couleurs, vides, par: null, parOptimal: false }
}

/**
 * Niveau de campagne.
 *
 * L'astuce qui rend la sélection abordable : prouver l'optimal coûte des
 * secondes, mais trouver UNE solution coûte des millisecondes — et la longueur
 * de cette solution approximative classe déjà bien les plateaux du plus facile
 * au plus corsé. On tire donc un lot, on le trie au moteur rapide, on choisit le
 * rang qui correspond à l'avancement du joueur, et on ne paie l'optimal QUE sur
 * l'élu.
 */
export function fabriquerNiveau(n, options = {}) {
  const reglages = parametres(n)
  const { hauteur, couleurs, vides, methode } = reglages
  // Prouver le minimum coûte des secondes à 6 unités, des dizaines à 7. On ne
  // paie ce prix que là où il est tenable ; au-delà le « par » devient la
  // meilleure solution connue, et l'écran le dit (« connu » et non « minimum »).
  const budgetParDefaut = hauteur <= 5 ? 6000000 : hauteur === 6 ? 8000000 : 1500000
  const { lot = 16, budgetOptimal = budgetParDefaut } = options
  const rand = graine(n * 7919 + 13)

  const candidats = []
  if (methode === 'arriere') {
    // Soluble par construction : pas besoin de solveur pour valider, seulement
    // pour classer. On garde le plateau le plus emmêlé du lot.
    for (let i = 0; i < 8; i++) {
      const etat = marcheArriere(couleurs, hauteur, vides, 4000, rand)
      if (gagne(etat, hauteur) || offert(etat, hauteur)) continue
      const solution = chercherUneSolution(etat, hauteur, 400000)
      if (!Array.isArray(solution)) continue
      candidats.push({ etat, longueurRapide: solution.length })
    }
  } else {
    for (let i = 0; i < lot * 4 && candidats.length < lot; i++) {
      const etat = distribuer(couleurs, hauteur, vides, rand)
      if (offert(etat, hauteur)) continue
      const solution = chercherUneSolution(etat, hauteur, 300000)
      if (!Array.isArray(solution)) continue // insoluble, ou hors budget : écarté
      candidats.push({ etat, longueurRapide: solution.length })
    }
  }
  if (candidats.length === 0) throw new Error(`Niveau ${n} : aucun plateau soluble`)

  candidats.sort((a, b) => a.longueurRapide - b.longueurRapide)
  // On part du milieu du lot au niveau 1 et on glisse vers le plus retors.
  const exigence = Math.min(0.95, 0.45 + n * 0.005)
  const elu = candidats[Math.round(exigence * (candidats.length - 1))]

  // Au-delà de 5 unités par tube, prouver le minimum coûte des dizaines de
  // secondes ET échoue souvent : on n'essaie même pas, on mesure au faisceau.
  const optimale = hauteur <= 5
    ? chercherSolutionOptimale(elu.etat, hauteur, budgetOptimal)
    : INCONNU
  if (Array.isArray(optimale)) {
    return { numero: n, etat: elu.etat, ...reglages, par: optimale.length, parOptimal: true }
  }
  // Sinon l'objectif est la meilleure solution que sait trouver le faisceau —
  // à 0,2 coup du minimum en moyenne, mesuré sur les 59 niveaux dont le minimum
  // est prouvé. L'écran l'annonce « connu » et non « minimum ».
  const faisceau = chercherParFaisceau(elu.etat, hauteur, 500)
  const par = Array.isArray(faisceau) ? faisceau.length : elu.longueurRapide
  return { numero: n, etat: elu.etat, ...reglages, par, parOptimal: false }
}

export { INCONNU }

// ============================================================ MARCHE ARRIÈRE ==
//
// Le générateur par tirage au hasard bute sur un mur : avec des tubes tous
// pleins et un seul tube libre, 0 plateau sur 120 est soluble. Toute la moitié
// difficile du genre lui est donc inaccessible.
//
// La parade : ne pas tirer un plateau en espérant qu'il se résolve — PARTIR DE
// L'ÉTAT RÉSOLU et jouer des coups à l'envers. Le plateau obtenu est soluble
// PAR CONSTRUCTION : il suffit de rejouer la marche dans l'autre sens.
//
// Un « déversement » prend k unités du sommet de B et les rend à A. Pour que le
// coup direct A→B soit exactement légal et déplace exactement ces k unités :
//   1. A doit être vide, ou son sommet d'une AUTRE couleur — sinon le bloc du
//      sommet de A serait plus gros que k et le coup direct en déplacerait plus.
//   2. A doit avoir la place.
//   3. Le coup direct doit pouvoir viser B : soit il reste de la même couleur
//      au sommet de B (k < bloc), soit B se vide complètement.
// Et on évite de fabriquer des coups que le solveur écarte comme stériles
// (un tube monochrome entier versé dans un vide), sinon la solution de retour
// passerait par un chemin qu'il refuse d'explorer.

/** Tous les déversements possibles, sous la forme [b, a, k]. */
function deversementsPossibles(etat, hauteur) {
  const coups = []
  for (let b = 0; b < etat.length; b++) {
    const tubeB = etat[b]
    if (tubeB.length === 0) continue
    const bloc = sommet(tubeB)
    for (let k = 1; k <= bloc.taille; k++) {
      // règle 3 : soit il reste de la couleur au sommet de B, soit B se vide
      if (k === bloc.taille && k !== tubeB.length) continue
      for (let a = 0; a < etat.length; a++) {
        if (a === b) continue
        const tubeA = etat[a]
        if (tubeA.length + k > hauteur) continue // règle 2
        if (tubeA.length > 0 && tubeA[tubeA.length - 1] === bloc.couleur) continue // règle 1
        // coup direct stérile : un tube monochrome entier versé dans un vide
        if (tubeA.length === 0 && k === tubeB.length) continue
        if (tubeA.length === 0 && k === hauteur) continue
        coups.push([b, a, k])
      }
    }
  }
  return coups
}

const appliquerDeversement = (etat, [b, a, k]) => {
  const couleur = etat[b][etat[b].length - 1]
  etat[b].length -= k
  for (let j = 0; j < k; j++) etat[a].push(couleur)
}

/**
 * Fabrique un plateau en remontant `pas` coups depuis l'état résolu.
 * Le résultat est soluble par construction ; aucun solveur n'est nécessaire
 * pour le garantir, seulement pour en mesurer la difficulté.
 *
 * ⚠️ La marche AU HASARD ne suffit pas : mesurée, elle sature autour de 26 coups
 * là où un tirage aléatoire en donne 50, et rallonger la marche n'y change rien.
 * Les coups inverses ramènent sans cesse les couleurs ensemble — l'état résolu
 * est un attracteur. Il faut donc CHOISIR à chaque pas le déversement qui
 * éparpille le plus, avec une part de hasard pour ne pas s'enfermer.
 *
 * Le repère d'éparpillement est le minorant : la somme, sur chaque couleur, du
 * nombre de tubes qu'elle occupe moins un. C'est exactement ce qu'il faudra
 * défaire ensuite.
 */
export function marcheArriere(couleurs, hauteur, vides, pas, rand, hasard = 0.25) {
  const etat = []
  for (let c = 0; c < couleurs; c++) etat.push(Array.from({ length: hauteur }, () => c))
  for (let v = 0; v < vides; v++) etat.push([])

  let sansProgres = 0
  let meilleur = minorant(etat)

  for (let i = 0; i < pas && sansProgres < 60; i++) {
    const coups = deversementsPossibles(etat, hauteur)
    if (coups.length === 0) break

    let choisi
    if (rand() < hasard) {
      choisi = coups[Math.floor(rand() * coups.length)]
    } else {
      // On garde le déversement qui éparpille le plus, à égalité près.
      let meilleurScore = -1
      const exaequo = []
      for (const coup of coups) {
        const essai = etat.map((t) => t.slice())
        appliquerDeversement(essai, coup)
        const score = minorant(essai)
        if (score > meilleurScore) { meilleurScore = score; exaequo.length = 0 }
        if (score === meilleurScore) exaequo.push(coup)
      }
      choisi = exaequo[Math.floor(rand() * exaequo.length)]
    }

    appliquerDeversement(etat, choisi)
    const score = minorant(etat)
    if (score > meilleur) { meilleur = score; sansProgres = 0 } else sansProgres++
  }
  return etat
}
