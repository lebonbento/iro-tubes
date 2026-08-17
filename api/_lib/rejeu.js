// La validation d'un résultat.
//
// Le point qui change tout par rapport à un classement de jeu d'arcade : ici le
// serveur ne CROIT pas le score annoncé, il REJOUE la partie. Le client envoie
// sa suite de coups, le serveur la déroule sur le plateau officiel du niveau et
// n'accepte que si elle mène vraiment à la victoire. Annoncer un score sans
// avoir résolu le casse-tête est donc impossible.

import { verser, gagne } from '../../src/logique.js'
import donnees from '../../src/niveaux.json' with { type: 'json' }

const PAR_NUMERO = new Map(donnees.niveaux.map((n) => [n.numero, n]))
const COUPS_MAX = 600

export const nombreDeNiveaux = donnees.niveaux.length

/**
 * Renvoie { coups, parfait } si la suite résout bien le niveau, sinon une
 * chaîne expliquant le refus.
 */
export function valider(numero, coups) {
  const niveau = PAR_NUMERO.get(numero)
  if (!niveau) return 'Niveau inconnu.'
  if (!Array.isArray(coups) || coups.length === 0) return 'Aucun coup fourni.'
  if (coups.length > COUPS_MAX) return 'Partie trop longue.'

  let etat = niveau.etat
  for (const coup of coups) {
    if (!Array.isArray(coup) || coup.length !== 2) return 'Coup mal formé.'
    const [de, vers] = coup
    if (!Number.isInteger(de) || !Number.isInteger(vers)) return 'Coup mal formé.'
    if (de < 0 || vers < 0 || de >= etat.length || vers >= etat.length) return 'Tube hors plateau.'
    const suivant = verser(etat, de, vers, niveau.hauteur)
    if (suivant === etat) return 'Coup impossible sur ce plateau.'
    etat = suivant
  }
  if (!gagne(etat, niveau.hauteur)) return 'La partie ne se termine pas gagnée.'

  // Filet supplémentaire : le solveur a prouvé le minimum, personne ne peut
  // descendre dessous. Si ça arrive, c'est notre « par » qui est faux.
  if (niveau.parOptimal && coups.length < niveau.par) return 'Résultat incohérent.'

  return { coups: coups.length, parfait: niveau.parOptimal && coups.length === niveau.par }
}
