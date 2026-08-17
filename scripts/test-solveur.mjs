// Le solveur, contrôlé par un arbitre indépendant.
//
// Le point délicat : IDA* n'est optimal QUE si le minorant est admissible. On ne
// le croit pas sur parole — un parcours en largeur, lent mais incontestable,
// recalcule la distance exacte sur des petits plateaux et on compare.

import { gagne, coupsPossibles, verser, cle } from '../src/logique.js'
import { chercherUneSolution, chercherSolutionOptimale, chercherParFaisceau, indice, INCONNU } from '../src/solveur.js'
import { graine } from '../src/generateur.js'

let ok = 0
const echecs = []
function verifie(nom, condition) {
  if (condition) ok++
  else echecs.push(nom)
}

/** L'arbitre : largeur d'abord, donc distance exacte. Réservé aux petits cas. */
function distanceExacte(depart, hauteur, plafondNoeuds = 200000) {
  if (gagne(depart, hauteur)) return 0
  let bord = [depart]
  const vus = new Set([cle(depart)])
  let profondeur = 0
  let noeuds = 0
  while (bord.length) {
    profondeur++
    const suivant = []
    for (const etat of bord) {
      for (const [de, vers] of coupsPossibles(etat, hauteur)) {
        const e2 = verser(etat, de, vers, hauteur)
        if (gagne(e2, hauteur)) return profondeur
        const k = cle(e2)
        if (vus.has(k)) continue
        vus.add(k)
        if (noeuds++ > plafondNoeuds) return null
        suivant.push(e2)
      }
    }
    bord = suivant
  }
  return Infinity // insoluble
}

/** Rejoue une solution et vérifie qu'elle mène vraiment à la victoire. */
function rejoue(depart, coups, hauteur) {
  let etat = depart
  for (const [de, vers] of coups) {
    const avant = etat
    etat = verser(etat, de, vers, hauteur)
    if (etat === avant) return false // coup illégal dans la solution
  }
  return gagne(etat, hauteur)
}

const H = 4

// --- cas connus à la main -------------------------------------------------
verifie('plateau déjà gagné : 0 coup',
  chercherSolutionOptimale([[1, 1, 1, 1], []], H).length === 0)

const unCoup = [[1, 1, 1], [1], []]
const solUnCoup = chercherSolutionOptimale(unCoup, H)
verifie('un seul coup suffit', solUnCoup.length === 1)
verifie('et ce coup gagne', rejoue(unCoup, solUnCoup, H))

// --- insoluble prouvé -----------------------------------------------------
// Deux tubes pleins et alternés, aucun tube libre : rien ne peut bouger.
const mur = [[1, 2, 1, 2], [2, 1, 2, 1]]
verifie('impasse totale détectée comme insoluble',
  chercherSolutionOptimale(mur, H) === null)
verifie('l\'autre moteur conclut pareil',
  chercherUneSolution(mur, H) === null)

// Insoluble plus subtil : un seul coup possible, et il mène à l'impasse.
const piege = [[1, 2, 2, 1], [2, 1, 1, 2], [1]]
const dPiege = distanceExacte(piege, H)
const sPiege = chercherSolutionOptimale(piege, H)
verifie('plateau piégé : les deux moteurs sont d\'accord',
  (dPiege === Infinity) === (sPiege === null))

// --- confrontation avec l'arbitre, sur 300 plateaux tirés au hasard --------
let compares = 0
let desaccords = 0
let insolubles = 0
const rand = graine(2026)
for (let essai = 0; essai < 300; essai++) {
  const couleurs = 3 + Math.floor(rand() * 2) // 3 ou 4 couleurs : arbitre viable
  const vides = 1 + Math.floor(rand() * 2)
  const unites = []
  for (let c = 0; c < couleurs; c++) for (let k = 0; k < H; k++) unites.push(c)
  for (let i = unites.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[unites[i], unites[j]] = [unites[j], unites[i]]
  }
  const etat = []
  for (let t = 0; t < couleurs; t++) etat.push(unites.slice(t * H, (t + 1) * H))
  for (let v = 0; v < vides; v++) etat.push([])

  const exacte = distanceExacte(etat, H)
  if (exacte === null) continue // arbitre débordé, on passe
  const trouvee = chercherSolutionOptimale(etat, H, 900000)

  if (exacte === Infinity) {
    insolubles++
    if (trouvee !== null) desaccords++
    continue
  }
  if (!Array.isArray(trouvee)) { desaccords++; continue }
  compares++
  if (trouvee.length !== exacte) desaccords++
  else if (!rejoue(etat, trouvee, H)) desaccords++
}

verifie(`optimalité confirmée sur ${compares} plateaux (0 désaccord)`, desaccords === 0)
verifie('l\'échantillon contenait bien des plateaux insolubles', insolubles > 0)
verifie('et bien des plateaux solubles', compares > 100)

// --- le moteur rapide trouve toujours une solution VALIDE ------------------
let rapidesTestes = 0
let rapidesFaux = 0
const rand2 = graine(77)
for (let essai = 0; essai < 40; essai++) {
  const couleurs = 8 + Math.floor(rand2() * 4)
  const unites = []
  for (let c = 0; c < couleurs; c++) for (let k = 0; k < H; k++) unites.push(c)
  for (let i = unites.length - 1; i > 0; i--) {
    const j = Math.floor(rand2() * (i + 1))
    ;[unites[i], unites[j]] = [unites[j], unites[i]]
  }
  const etat = []
  for (let t = 0; t < couleurs; t++) etat.push(unites.slice(t * H, (t + 1) * H))
  etat.push([], [])
  const sol = chercherUneSolution(etat, H, 400000)
  if (!Array.isArray(sol)) continue
  rapidesTestes++
  if (!rejoue(etat, sol, H)) rapidesFaux++
}
verifie(`les ${rapidesTestes} solutions rapides mènent bien à la victoire`, rapidesFaux === 0)
verifie('le moteur rapide encaisse 12 couleurs', rapidesTestes > 20)

// --- l'indice est un coup jouable qui rapproche du but ---------------------
const plateauIndice = [[1, 2, 3, 1], [2, 3, 1, 2], [3, 1, 2, 3], [], []]
const c = indice(plateauIndice, H)
verifie('l\'indice renvoie un coup', Array.isArray(c))
verifie('l\'indice est un coup légal',
  coupsPossibles(plateauIndice, H).some(([a, b]) => a === c[0] && b === c[1]))
verifie('aucun indice sur un plateau gagné', indice([[1, 1, 1, 1], []], H) === null)

// --- le budget épuisé se dit, il ne ment pas ------------------------------
const gros = []
for (let couleur = 0; couleur < 12; couleur++) gros.push([couleur, (couleur + 5) % 12, (couleur + 7) % 12, (couleur + 3) % 12])
gros.push([], [])
const serre = chercherSolutionOptimale(gros, H, 500)
verifie('budget minuscule -> INCONNU, pas une fausse réponse',
  serre === INCONNU || Array.isArray(serre))

// --- la recherche en faisceau ---------------------------------------------
// Elle sert d'objectif sur les grands plateaux : elle doit rendre de VRAIES
// solutions, et jamais une plus courte que le minimum (ce serait impossible).
let faisceauTestes = 0
let faisceauFaux = 0
let faisceauSousMin = 0
let faisceauEcart = 0
const rand3 = graine(555)
for (let essai = 0; essai < 60; essai++) {
  const couleurs = 3 + Math.floor(rand3() * 2)
  const unites = []
  for (let c = 0; c < couleurs; c++) for (let k = 0; k < H; k++) unites.push(c)
  for (let i = unites.length - 1; i > 0; i--) {
    const j = Math.floor(rand3() * (i + 1))
    ;[unites[i], unites[j]] = [unites[j], unites[i]]
  }
  const etat = []
  for (let t = 0; t < couleurs; t++) etat.push(unites.slice(t * H, (t + 1) * H))
  etat.push([], [])
  const exact = distanceExacte(etat, H)
  if (exact === null || exact === Infinity) continue
  const f = chercherParFaisceau(etat, H, 300)
  if (!Array.isArray(f) || !rejoue(etat, f, H)) { faisceauFaux++; continue }
  faisceauTestes++
  if (f.length < exact) faisceauSousMin++
  faisceauEcart += f.length - exact
}
verifie(`les ${faisceauTestes} solutions du faisceau sont valides`, faisceauFaux === 0)
verifie('le faisceau ne descend JAMAIS sous le minimum réel', faisceauSousMin === 0)
verifie(`le faisceau reste proche du minimum (+${(faisceauEcart / faisceauTestes).toFixed(2)})`,
  faisceauEcart / faisceauTestes < 1)

console.log(`\n  solveur : ${ok} vérifications passées`)
console.log(`  arbitre indépendant : ${compares} plateaux comparés, ${insolubles} insolubles reconnus`)
if (echecs.length) {
  console.log(`  ${echecs.length} ÉCHECS :`)
  for (const e of echecs) console.log(`   ✗ ${e}`)
  process.exit(1)
}
