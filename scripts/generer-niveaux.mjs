// Fabrique les niveaux une fois pour toutes, dans src/niveaux.json.
//
// Pourquoi au build et pas dans le navigateur : valider un plateau coûte parfois
// une seconde de calcul. Sur un téléphone, ça se voit. Et surtout, un niveau
// figé dans le dépôt est le MÊME pour tout le monde — on peut se comparer.
//
//   npm run niveaux            -> 200 niveaux
//   node scripts/generer-niveaux.mjs 400

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { fabriquerNiveau } from '../src/generateur.js'
import { chercherUneSolution } from '../src/solveur.js'
import { gagne, verser } from '../src/logique.js'

const ici = dirname(fileURLToPath(import.meta.url))
const combien = Number(process.argv[2] ?? 200)

const niveaux = []
const debut = Date.now()
let optimaux = 0

for (let n = 1; n <= combien; n++) {
  const niveau = fabriquerNiveau(n)

  // Ceinture et bretelles : on re-prouve la solvabilité du plateau retenu, en
  // rejouant vraiment la solution jusqu'à la victoire.
  const sol = chercherUneSolution(niveau.etat, niveau.hauteur, 600000)
  if (!Array.isArray(sol)) throw new Error(`Niveau ${n} : solvabilité non reconfirmée`)
  let etat = niveau.etat
  for (const [de, vers] of sol) etat = verser(etat, de, vers, niveau.hauteur)
  if (!gagne(etat, niveau.hauteur)) throw new Error(`Niveau ${n} : la solution ne gagne pas`)

  if (niveau.parOptimal) optimaux++
  niveaux.push(niveau)
  if (n % 20 === 0) {
    const s = ((Date.now() - debut) / 1000).toFixed(1)
    process.stdout.write(`  ${n}/${combien} niveaux  (${s}s)\n`)
  }
}

const sortie = join(ici, '..', 'src', 'niveaux.json')
writeFileSync(sortie, JSON.stringify({ version: 1, niveaux }, null, 0))

const poids = (JSON.stringify({ version: 1, niveaux }).length / 1024).toFixed(1)
console.log(`\n  ${niveaux.length} niveaux écrits dans src/niveaux.json (${poids} Ko)`)
console.log(`  « par » prouvé minimal : ${optimaux}/${niveaux.length}`)
console.log(`  temps total : ${((Date.now() - debut) / 1000).toFixed(1)}s`)
