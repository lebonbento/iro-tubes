// Les règles, vérifiées à la main sur des plateaux minuscules.
import {
  sommet, tubeFini, gagne, coupLegal, quantiteVersee, verser,
  coupsPossibles, cle, minorant, coupInutile,
} from '../src/logique.js'

let ok = 0
const echecs = []
function verifie(nom, condition) {
  if (condition) ok++
  else echecs.push(nom)
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const H = 4

// --- sommet ---------------------------------------------------------------
verifie('sommet d\'un tube vide = null', sommet([]) === null)
verifie('sommet simple', eq(sommet([1, 2, 3]), { couleur: 3, taille: 1 }))
verifie('sommet en bloc', eq(sommet([1, 2, 2, 2]), { couleur: 2, taille: 3 }))
verifie('sommet du tube entier', eq(sommet([5, 5, 5, 5]), { couleur: 5, taille: 4 }))

// --- tube fini ------------------------------------------------------------
verifie('tube vide est fini', tubeFini([], H))
verifie('tube plein monochrome est fini', tubeFini([2, 2, 2, 2], H))
verifie('tube monochrome incomplet n\'est PAS fini', !tubeFini([2, 2, 2], H))
verifie('tube plein mélangé n\'est pas fini', !tubeFini([2, 2, 2, 1], H))

// --- victoire -------------------------------------------------------------
verifie('victoire', gagne([[1, 1, 1, 1], [], [2, 2, 2, 2]], H))
verifie('pas victoire si un tube est à moitié', !gagne([[1, 1, 1], [1], []], H))

// --- légalité -------------------------------------------------------------
const e1 = [[1, 2], [2], [], [3, 3, 3, 3]]
verifie('verser sur la même couleur : légal', coupLegal(e1, 0, 1, H))
verifie('verser dans le vide : légal', coupLegal(e1, 0, 2, H))
verifie('verser sur une autre couleur : illégal', !coupLegal(e1, 1, 3, H))
verifie('verser depuis un tube vide : illégal', !coupLegal(e1, 2, 1, H))
verifie('verser dans un tube plein : illégal', !coupLegal(e1, 0, 3, H))
verifie('verser sur soi-même : illégal', !coupLegal(e1, 0, 0, H))

// --- quantité : tout le bloc, borné par la place ---------------------------
verifie('un bloc de 3 passe entier dans un tube vide',
  quantiteVersee([[1, 2, 2, 2], []], 0, 1, H) === 3)
verifie('la place restante borne le versement',
  quantiteVersee([[1, 2, 2, 2], [2, 2, 2]], 0, 1, H) === 1)
verifie('bloc de 1', quantiteVersee([[2, 1], [1]], 0, 1, H) === 1)

// --- versement ------------------------------------------------------------
const avant = [[1, 2, 2, 2], [2], []]
const apres = verser(avant, 0, 1, H)
verifie('le versement déplace tout le bloc possible', eq(apres, [[1], [2, 2, 2, 2], []]))
verifie('l\'état d\'origine n\'est pas modifié', eq(avant, [[1, 2, 2, 2], [2], []]))
verifie('les tubes non touchés sont partagés, pas copiés', apres[2] === avant[2])
verifie('un coup illégal ne change rien', verser(avant, 1, 0, H) === avant || eq(verser([[1], [2]], 0, 1, H), [[1], [2]]))

// --- coups stériles -------------------------------------------------------
verifie('déplacer un tube monochrome vers un vide est stérile',
  coupInutile([[3, 3], []], 0, 1, H))
verifie('démonter un tube terminé est stérile',
  coupInutile([[3, 3, 3, 3], [3]], 0, 1, H))
verifie('un vrai coup n\'est pas stérile',
  !coupInutile([[1, 3, 3], [3]], 0, 1, H))

// --- coups possibles ------------------------------------------------------
const deuxVides = coupsPossibles([[1, 2], [], []], H)
verifie('un seul tube vide est proposé comme cible', deuxVides.length === 1)
verifie('aucun coup sur un plateau gagné', coupsPossibles([[1, 1, 1, 1], []], H).length === 0)
verifie('impasse détectée', coupsPossibles([[1, 2, 1, 2], [2, 1, 2, 1]], H).length === 0)

// --- clé canonique --------------------------------------------------------
verifie('deux plateaux permutés ont la même clé',
  cle([[1, 2], [3], []]) === cle([[3], [], [1, 2]]))
verifie('deux plateaux différents ont des clés différentes',
  cle([[1, 2], []]) !== cle([[2, 1], []]))

// --- minorant -------------------------------------------------------------
verifie('minorant nul sur un plateau rangé', minorant([[1, 1, 1, 1], []]) === 0)
verifie('minorant d\'une couleur sur 2 tubes', minorant([[1], [1], []]) === 1)
verifie('minorant de 2 couleurs sur 3 tubes chacune',
  minorant([[1, 2], [1, 2], [1, 2], []]) === 4)

// Le minorant doit rester un MINORANT : jamais plus que la vraie distance.
// Vérifié ici sur un plateau dont on connaît la solution à la main.
const facile = [[1, 2], [2, 1], []]
verifie('le minorant ne dépasse pas la solution réelle', minorant(facile) <= 4)

console.log(`\n  logique : ${ok} vérifications passées`)
if (echecs.length) {
  console.log(`  ${echecs.length} ÉCHECS :`)
  for (const e of echecs) console.log(`   ✗ ${e}`)
  process.exit(1)
}
