// Le parcours complet, dans un vrai navigateur, sur une vraie URL.
//
// Un build vert ne prouve rien : ce test résout le niveau 1 avec le solveur,
// clique réellement les tubes dans le navigateur, et exige l'écran de victoire.
// Il vérifie aussi qu'il ne reste AUCUN tube mélangé à l'arrivée.
//
//   npm run test-parcours                       -> sur le serveur local
//   npm run test-parcours https://…             -> sur la production

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium, devices } from 'playwright'
import { chercherSolutionOptimale } from '../src/solveur.js'

const ici = dirname(fileURLToPath(import.meta.url))
const { niveaux } = JSON.parse(readFileSync(join(ici, '..', 'src', 'niveaux.json'), 'utf8'))
const url = process.argv[2] ?? 'http://localhost:4321/'

const niveau = niveaux[0]
const solution = chercherSolutionOptimale(niveau.etat, niveau.hauteur, 900000)
if (!Array.isArray(solution)) throw new Error('Le solveur ne résout pas le niveau 1 (!)')

const nav = await chromium.launch()
const ctx = await nav.newContext({ ...devices['iPhone SE'] })
const page = await ctx.newPage()
const erreurs = []
page.on('pageerror', (e) => erreurs.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()) })

await page.goto(url, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Commencer', exact: true }).click()
await page.waitForTimeout(300)

const tubes = page.locator('.iro-tube')
if (await tubes.count() !== niveau.etat.length) {
  throw new Error(`${await tubes.count()} tubes affichés, ${niveau.etat.length} attendus`)
}

for (const [de, vers] of solution) {
  await tubes.nth(de).click()
  await page.waitForTimeout(90)
  await tubes.nth(vers).click()
  // monte + versement + retour, avec de la marge
  await page.waitForTimeout(1150)
}

await page.waitForTimeout(900)
const victoire = await page.getByText('Tubes rangés').count()
const coups = await page.locator('.iro-titre span').innerText()

// Contrôle indépendant de l'affichage : chaque tube ne doit montrer qu'une teinte.
const teintes = await page.evaluate(() =>
  [...document.querySelectorAll('.iro-tube')].map((t) =>
    [...new Set([...t.querySelectorAll('.iro-unite')].map((u) => u.style.background))]))
const melanges = teintes.filter((t) => t.length > 1)

console.log(`\n  parcours sur ${url}`)
console.log(`  solution jouée : ${solution.length} coups — affiché « ${coups} »`)
console.log(`  tubes encore mélangés : ${melanges.length}`)
if (erreurs.length) console.log(`  erreurs console : ${erreurs.join(' | ')}`)

await nav.close()

if (!victoire) { console.log('  ✗ pas d’écran de victoire'); process.exit(1) }
if (melanges.length) { console.log('  ✗ des tubes restent mélangés'); process.exit(1) }
if (erreurs.length) process.exit(1)
console.log('  ✓ niveau terminé, victoire affichée, aucun tube mélangé')
