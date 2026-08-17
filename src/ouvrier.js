// Le solveur tourne dans un fil séparé.
//
// Chercher un indice sur un plateau à 12 couleurs peut prendre une demi-seconde.
// Dans le fil principal, ça fige l'écran pendant l'animation et le jeu paraît
// cassé. Ici, l'interface reste vivante et affiche « je cherche… ».

import { indice } from './solveur.js'
import { fabriquerAleatoire, graine } from './generateur.js'

self.onmessage = (evenement) => {
  const { id, type, charge } = evenement.data
  try {
    if (type === 'indice') {
      self.postMessage({ id, resultat: indice(charge.etat, charge.hauteur) })
      return
    }
    if (type === 'libre') {
      const niveau = fabriquerAleatoire(charge.couleurs, charge.hauteur, charge.vides, graine(charge.graine))
      self.postMessage({ id, resultat: niveau })
      return
    }
    self.postMessage({ id, erreur: `type inconnu : ${type}` })
  } catch (erreur) {
    self.postMessage({ id, erreur: String(erreur?.message ?? erreur) })
  }
}
