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

import { tubeFini } from './logique.js'
import { chercherUneSolution, chercherSolutionOptimale, INCONNU } from './solveur.js'

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
  if (n <= 20) {
    // Apprentissage : 3 couleurs jusqu'à 12, tubes de 4.
    return { hauteur: 4, couleurs: Math.min(12, 3 + Math.floor((n - 1) / 2)), vides: 2 }
  }
  if (n <= 36) {
    // Les tubes s'allongent : mêmes couleurs, mais 5 unités à empiler.
    return { hauteur: 5, couleurs: Math.min(12, 10 + Math.floor((n - 21) / 6)), vides: 2 }
  }
  // Plein format. Au-delà, c'est la SÉLECTION des plateaux qui durcit le jeu.
  return { hauteur: 5, couleurs: 12, vides: 2 }
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
  const { lot = 16, budgetOptimal = 6000000 } = options
  const reglages = parametres(n)
  const { hauteur, couleurs, vides } = reglages
  const rand = graine(n * 7919 + 13)

  const candidats = []
  for (let i = 0; i < lot * 4 && candidats.length < lot; i++) {
    const etat = distribuer(couleurs, hauteur, vides, rand)
    if (offert(etat, hauteur)) continue
    const solution = chercherUneSolution(etat, hauteur, 300000)
    if (!Array.isArray(solution)) continue // insoluble, ou hors budget : écarté
    candidats.push({ etat, longueurRapide: solution.length })
  }
  if (candidats.length === 0) throw new Error(`Niveau ${n} : aucun plateau soluble`)

  candidats.sort((a, b) => a.longueurRapide - b.longueurRapide)
  // On part du milieu du lot au niveau 1 et on glisse vers le plus retors.
  const exigence = Math.min(0.95, 0.45 + n * 0.005)
  const elu = candidats[Math.round(exigence * (candidats.length - 1))]

  const optimale = chercherSolutionOptimale(elu.etat, hauteur, budgetOptimal)
  if (Array.isArray(optimale)) {
    return { numero: n, etat: elu.etat, ...reglages, par: optimale.length, parOptimal: true }
  }
  // Budget épuisé : le plateau reste JOUABLE (le moteur rapide l'a prouvé), on
  // annonce simplement la meilleure solution connue au lieu du minimum.
  return { numero: n, etat: elu.etat, ...reglages, par: elu.longueurRapide, parOptimal: false }
}

export { INCONNU }
