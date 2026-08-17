// Contrôle du fichier de niveaux livré avec le jeu.
//
// C'est le garde-fou qui compte vraiment : si un seul niveau embarqué était
// insoluble, le joueur s'acharnerait sans jamais pouvoir gagner, et rien dans
// l'interface ne le lui dirait.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { gagne, verser, tubeFini, minorant } from '../src/logique.js'
import { chercherUneSolution } from '../src/solveur.js'
import { parametres, fabriquerNiveau } from '../src/generateur.js'

const ici = dirname(fileURLToPath(import.meta.url))
const { niveaux } = JSON.parse(readFileSync(join(ici, '..', 'src', 'niveaux.json'), 'utf8'))

let ok = 0
const echecs = []
const verifie = (nom, condition) => (condition ? ok++ : echecs.push(nom))

verifie('le fichier contient des niveaux', niveaux.length > 0)

let precedent = 0
let croissances = 0
for (const n of niveaux) {
  const attendu = parametres(n.numero)
  const etiquette = `niveau ${n.numero}`

  verifie(`${etiquette} : réglages conformes à la courbe`,
    n.hauteur === attendu.hauteur && n.couleurs === attendu.couleurs && n.vides === attendu.vides)

  verifie(`${etiquette} : nombre de tubes`, n.etat.length === n.couleurs + n.vides)
  // Les niveaux fabriqués en marche arrière ont, eux, des tubes partiellement
  // remplis : c'est précisément ce que le tirage au hasard ne sait pas produire.
  if (n.methode !== 'arriere') {
    verifie(`${etiquette} : tubes de couleur pleins`,
      n.etat.slice(0, n.couleurs).every((t) => t.length === n.hauteur))
    verifie(`${etiquette} : tubes libres vides`,
      n.etat.slice(n.couleurs).every((t) => t.length === 0))
  }

  const compte = new Map()
  for (const tube of n.etat) for (const c of tube) compte.set(c, (compte.get(c) ?? 0) + 1)
  verifie(`${etiquette} : ${n.couleurs} couleurs présentes`, compte.size === n.couleurs)
  verifie(`${etiquette} : chaque couleur en ${n.hauteur} unités`,
    [...compte.values()].every((v) => v === n.hauteur))

  verifie(`${etiquette} : aucune couleur offerte au départ`,
    !n.etat.some((t) => t.length > 0 && tubeFini(t, n.hauteur)))
  verifie(`${etiquette} : pas déjà gagné`, !gagne(n.etat, n.hauteur))

  // LE contrôle : on rejoue une solution jusqu'à la victoire.
  const solution = chercherUneSolution(n.etat, n.hauteur, 600000)
  const jouable = Array.isArray(solution)
  verifie(`${etiquette} : SOLUBLE`, jouable)
  if (jouable) {
    let etat = n.etat
    for (const [de, vers] of solution) etat = verser(etat, de, vers, n.hauteur)
    verifie(`${etiquette} : la solution mène bien à la victoire`, gagne(etat, n.hauteur))
    verifie(`${etiquette} : le « par » annoncé ne dépasse pas une solution connue`,
      n.par <= solution.length)
  }

  verifie(`${etiquette} : « par » au-dessus du minorant théorique`, n.par >= minorant(n.etat))
  if (n.par > precedent) croissances++
  precedent = n.par
}

// La difficulté monte jusqu'au niveau 200 ; au-delà c'est une rotation de
// formats, donc le « par » oscille exprès. On contrôle donc la MOYENNE par
// tranche, pas la monotonie coup par coup.
const moyenne = (a, b) => {
  const t = niveaux.filter((n) => n.numero >= a && n.numero <= b)
  return t.length ? t.reduce((s, n) => s + n.par, 0) / t.length : 0
}
const tranches = [[1, 20], [21, 60], [61, 120], [121, 200]].filter(([a]) => a <= niveaux.length)
for (let i = 1; i < tranches.length; i++) {
  const avant = moyenne(...tranches[i - 1])
  const apres = moyenne(...tranches[i])
  verifie(`la difficulté monte de la tranche ${tranches[i - 1].join('-')} (${avant.toFixed(0)}) `
    + `à ${tranches[i].join('-')} (${apres.toFixed(0)})`, apres > avant)
}

// Le minimum n'est prouvé que là où c'est calculable (jusqu'à 5 unités par
// tube). Au-delà, l'objectif vient du faisceau et l'écran l'annonce « connu ».
const petits = niveaux.filter((n) => n.hauteur <= 5)
const prouvesPetits = petits.filter((n) => n.parOptimal).length
verifie(`minimum prouvé sur les plateaux jusqu'à 5 unités (${prouvesPetits}/${petits.length})`,
  prouvesPetits >= petits.length * 0.9)
const prouves = niveaux.filter((n) => n.parOptimal).length
verifie('aucun grand plateau ne se prétend au minimum',
  niveaux.every((n) => !n.parOptimal || n.hauteur <= 5))

// Déterminisme : régénérer le niveau 1 et le niveau 25 doit redonner le même
// plateau, sinon la promesse « le niveau 42 est le même pour tous » est fausse.
for (const n of [1, 25]) {
  const refait = fabriquerNiveau(n)
  const livre = niveaux.find((x) => x.numero === n)
  if (livre) {
    verifie(`niveau ${n} : régénération identique`,
      JSON.stringify(refait.etat) === JSON.stringify(livre.etat) && refait.par === livre.par)
  }
}

console.log(`\n  niveaux : ${niveaux.length} niveaux, ${ok} vérifications passées`)
console.log(`  « par » prouvé minimal : ${prouves}/${niveaux.length}`)
console.log(`  difficulté : ${niveaux[0].par} coups au niveau 1 -> ${niveaux[niveaux.length - 1].par} au niveau ${niveaux.length}`)
if (echecs.length) {
  console.log(`  ${echecs.length} ÉCHECS :`)
  for (const e of echecs.slice(0, 20)) console.log(`   ✗ ${e}`)
  process.exit(1)
}
