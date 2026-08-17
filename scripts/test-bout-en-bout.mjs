// Du doigt du joueur jusqu'à la ligne du classement.
//
// Les tests précédents prouvent les règles, le solveur, l'API. Celui-ci prouve
// la SOUDURE : on crée un compte dans l'interface, on résout un niveau en
// cliquant vraiment, et on exige de se voir apparaître dans le tableau.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { chromium, devices } from 'playwright'
import { demarrer } from './serveur-local.mjs'
import { chercherSolutionOptimale } from '../src/solveur.js'

process.env.IRO_SEL = 'sel-de-test-suffisamment-long-0123456789'

const ici = dirname(fileURLToPath(import.meta.url))
const { niveaux } = JSON.parse(readFileSync(join(ici, '..', 'src', 'niveaux.json'), 'utf8'))
const niveau = niveaux[0]
const solution = chercherSolutionOptimale(niveau.etat, niveau.hauteur, 900000)

let ok = 0
const echecs = []
const verifie = (nom, condition) => (condition ? ok++ : echecs.push(nom))

const { serveur, url } = await demarrer(4333)
const nav = await chromium.launch()
const ctx = await nav.newContext({ ...devices['iPhone SE'] })
const page = await ctx.newPage()
const erreurs = []
page.on('pageerror', (e) => erreurs.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()) })

await page.goto(url, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Commencer', exact: true }).click()
await page.waitForTimeout(250)

// --- création du compte dans l'interface ----------------------------------
await page.getByLabel('Classement').click()
await page.waitForTimeout(400)
verifie('le classement s’ouvre et se dit vide',
  (await page.getByText('Personne n’est encore classé').count()) === 1)

await page.getByRole('button', { name: 'Rejoindre', exact: true }).click()
await page.waitForTimeout(200)
await page.getByPlaceholder('MIKI').fill('miki')
await page.getByPlaceholder('••••').fill('4321')
await page.getByRole('button', { name: 'Créer / rejoindre' }).click()
await page.waitForTimeout(700)
verifie('après création, on retombe sur le classement',
  (await page.getByText('Classement mondial').count()) === 1)
await page.getByRole('button', { name: 'Fermer' }).click()
await page.waitForTimeout(300)

// --- on résout le niveau en cliquant --------------------------------------
const tubes = page.locator('.iro-tube')
for (const [de, vers] of solution) {
  await tubes.nth(de).click()
  await page.waitForTimeout(90)
  await tubes.nth(vers).click()
  await page.waitForTimeout(1150)
}
await page.waitForTimeout(1400)

verifie('écran de victoire', (await page.getByText('Tubes rangés').count()) === 1)
const message = await page.locator('.iro-panneau .iro-note').first().innerText()
verifie(`le résultat est annoncé envoyé (« ${message} »)`, /Classement mis à jour/.test(message))

// --- et on se voit dans le tableau ----------------------------------------
await page.locator('.iro-panneau').getByRole('button', { name: 'Classement', exact: true }).click()
await page.waitForTimeout(700)
const lignes = await page.locator('.iro-table tbody tr').allInnerTexts()
verifie('une ligne de classement existe', lignes.length === 1)
verifie(`la ligne est bien la nôtre (« ${lignes[0]?.replace(/\s+/g, ' ')} »)`,
  /MIKI/.test(lignes[0] ?? ''))
verifie('elle est mise en avant comme étant la nôtre',
  (await page.locator('.iro-table tr.est-moi').count()) === 1)

await nav.close()
serveur.close()

console.log(`\n  bout en bout : ${ok} vérifications passées`)
if (erreurs.length) console.log(`  erreurs console : ${erreurs.join(' | ')}`)
if (echecs.length) {
  console.log(`  ${echecs.length} ÉCHECS :`)
  for (const e of echecs) console.log(`   ✗ ${e}`)
  process.exit(1)
}
if (erreurs.length) process.exit(1)
