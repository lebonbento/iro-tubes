// IRO 色 — les règles du jeu, pures : aucune dépendance, aucun effet de bord.
// Un état est un tableau de tubes. Un tube est un tableau de couleurs (entiers),
// l'indice 0 est le FOND du tube, le dernier élément est la surface.
// La hauteur (capacité) est portée par le niveau, pas par le tube.

/** Le bloc contigu de même couleur au sommet du tube. */
export function sommet(tube) {
  if (tube.length === 0) return null
  const couleur = tube[tube.length - 1]
  let taille = 1
  while (taille < tube.length && tube[tube.length - 1 - taille] === couleur) taille++
  return { couleur, taille }
}

/** Un tube fini : vide, ou plein d'une seule couleur. */
export function tubeFini(tube, hauteur) {
  if (tube.length === 0) return true
  if (tube.length !== hauteur) return false
  return tube.every((c) => c === tube[0])
}

export function gagne(etat, hauteur) {
  return etat.every((tube) => tubeFini(tube, hauteur))
}

/**
 * Le coup `de` -> `vers` est-il légal ?
 * Règles : on ne verse que le bloc du sommet, sur une couleur identique ou dans
 * un tube vide, et il faut au moins une place libre à l'arrivée.
 */
export function coupLegal(etat, de, vers, hauteur) {
  if (de === vers) return false
  const source = etat[de]
  const cible = etat[vers]
  if (source.length === 0) return false
  if (cible.length >= hauteur) return false
  if (cible.length > 0 && cible[cible.length - 1] !== source[source.length - 1]) return false
  return true
}

/**
 * Combien d'unités partiraient réellement : tout le bloc du sommet, borné par la
 * place restante à l'arrivée.
 */
export function quantiteVersee(etat, de, vers, hauteur) {
  if (!coupLegal(etat, de, vers, hauteur)) return 0
  return Math.min(sommet(etat[de]).taille, hauteur - etat[vers].length)
}

/** Applique le coup et renvoie un NOUVEL état (l'ancien n'est jamais modifié). */
export function verser(etat, de, vers, hauteur) {
  const n = quantiteVersee(etat, de, vers, hauteur)
  if (n === 0) return etat
  const suivant = etat.map((tube, i) => (i === de || i === vers ? tube.slice() : tube))
  const couleur = suivant[de][suivant[de].length - 1]
  suivant[de].length -= n
  for (let i = 0; i < n; i++) suivant[vers].push(couleur)
  return suivant
}

/**
 * Un coup qui ne fait pas avancer la partie : déplacer un tube déjà rangé, ou
 * transvaser vers un tube vide sans rien gagner. On les cache au joueur ET on
 * les retire de la recherche, sinon le solveur tourne en rond.
 */
export function coupInutile(etat, de, vers, hauteur) {
  const source = etat[de]
  const cible = etat[vers]
  const bloc = sommet(source)
  if (!bloc) return true
  // Le tube source est monochrome et intégralement déplacé : on ne fait que le
  // renommer (vers un tube vide) ou le vider (vers un tube plus rempli sans gain).
  const sourceMonochrome = bloc.taille === source.length
  if (sourceMonochrome && cible.length === 0) return true
  // Un tube déjà terminé ne se démonte pas.
  if (tubeFini(source, hauteur)) return true
  return false
}

/** Tous les coups jouables, les coups stériles exclus. */
export function coupsPossibles(etat, hauteur) {
  const coups = []
  let videDejaVu = -1
  for (let vers = 0; vers < etat.length; vers++) {
    // Les tubes vides sont interchangeables : un seul suffit à la recherche.
    if (etat[vers].length === 0) {
      if (videDejaVu !== -1) continue
      videDejaVu = vers
    }
    for (let de = 0; de < etat.length; de++) {
      if (!coupLegal(etat, de, vers, hauteur)) continue
      if (coupInutile(etat, de, vers, hauteur)) continue
      coups.push([de, vers])
    }
  }
  return coups
}

/**
 * Clé canonique d'un état : les tubes sont interchangeables, donc on les trie.
 * Sans ça la recherche explore N! fois le même plateau.
 */
export function cle(etat) {
  const tubes = etat.map((t) => t.join(','))
  tubes.sort()
  return tubes.join('|')
}

/**
 * Minorant admissible du nombre de coups restants : pour rassembler une couleur
 * éparpillée sur k tubes il faut au moins k-1 versements, et un versement ne fait
 * baisser cette somme que de 1 au mieux.
 */
export function minorant(etat) {
  const presence = new Map()
  for (const tube of etat) {
    const vues = new Set(tube)
    for (const c of vues) presence.set(c, (presence.get(c) ?? 0) + 1)
  }
  let total = 0
  for (const k of presence.values()) total += k - 1
  return total
}

export const clone = (etat) => etat.map((t) => t.slice())
