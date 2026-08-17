// Le garde-fou : ce qui doit rester vrai à chaque livraison.
//
//   npm run verifie                  -> sur dist/ via le serveur local
//   npm run verifie https://…        -> sur la production
//
// Il vérifie quatre choses qu'un build vert ne dit PAS :
//   1. le plateau tient en entier, sans défilement, du petit téléphone à l'iPad ;
//   2. le jeu se charge et se joue RÉSEAU COUPÉ (c'est la promesse de la PWA) ;
//   3. aucune requête ne part vers un serveur tiers ;
//   4. les écrans (règles, niveaux, classement, réglages) s'ouvrent sans erreur.

import { chromium, devices } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { demarrer } from './serveur-local.mjs'

process.env.IRO_SEL ??= 'sel-de-verification-suffisamment-long-0123'

const ici = dirname(fileURLToPath(import.meta.url))
const dossier = join(ici, '..', 'captures')
mkdirSync(dossier, { recursive: true })

let serveurLocal = null
let url = process.argv[2]
if (!url) {
  serveurLocal = await demarrer(4334)
  url = serveurLocal.url
}

let ok = 0
const echecs = []
const verifie = (nom, condition) => (condition ? ok++ : echecs.push(nom))

const nav = await chromium.launch()
const externes = []

const APPAREILS = [
  ['iPhone SE', devices['iPhone SE']],
  ['iPhone 14 Pro Max', devices['iPhone 14 Pro Max']],
  ['iPad (Gen 7)', devices['iPad (gen 7)']],
  ['bureau', { viewport: { width: 1440, height: 900 } }],
]

for (const [nom, appareil] of APPAREILS) {
  const ctx = await nav.newContext({ ...appareil })
  const page = await ctx.newPage()
  const erreurs = []
  page.on('pageerror', (e) => erreurs.push(`${nom} : ${e.message}`))
  page.on('request', (r) => {
    const h = new URL(r.url()).host
    if (h && !r.url().startsWith(url) && !r.url().startsWith('data:')) externes.push(`${nom} -> ${r.url()}`)
  })

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Commencer', exact: true }).click()
  await page.waitForTimeout(400)

  // Le plus gros plateau du jeu, celui qui casse les mises en page.
  await page.evaluate(() => {
    localStorage.setItem('iro-progression', JSON.stringify({
      vu: true, sons: true, motifs: false, dernier: 60,
      termines: Object.fromEntries(Array.from({ length: 59 }, (_, i) => [i + 1, { coups: 30 }])),
    }))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  const mesures = await page.evaluate(() => {
    const r = document.documentElement
    const tubes = [...document.querySelectorAll('.iro-tube')].map((t) => t.getBoundingClientRect())
    return {
      debordeH: r.scrollWidth > window.innerWidth + 1,
      debordeV: r.scrollHeight > window.innerHeight + 1,
      nbTubes: tubes.length,
      plusPetit: Math.min(...tubes.map((t) => t.width)),
      hors: tubes.some((t) => t.top < 0 || t.bottom > window.innerHeight || t.left < 0 || t.right > window.innerWidth),
    }
  })
  verifie(`${nom} : pas de défilement horizontal`, !mesures.debordeH)
  verifie(`${nom} : pas de défilement vertical`, !mesures.debordeV)
  verifie(`${nom} : les 14 tubes sont là`, mesures.nbTubes === 14)
  verifie(`${nom} : aucun tube hors de l’écran`, !mesures.hors)
  verifie(`${nom} : les tubes restent touchables (${mesures.plusPetit.toFixed(0)} px)`, mesures.plusPetit >= 26)

  await page.screenshot({ path: join(dossier, `${nom.replace(/\W+/g, '-')}.png`) })

  // Les écrans s'ouvrent-ils ?
  for (const [bouton, marqueur] of [['Niveaux', 'Les niveaux'], ['Classement', 'Classement mondial'], ['Réglages', 'Réglages']]) {
    await page.getByLabel(bouton).click()
    await page.waitForTimeout(450)
    verifie(`${nom} : l’écran « ${bouton} » s’ouvre`, (await page.getByText(marqueur).count()) >= 1)
    await page.locator('.iro-panneau').getByRole('button', { name: /Fermer|Retour au jeu/ }).first().click()
    await page.waitForTimeout(250)
  }

  verifie(`${nom} : aucune erreur JavaScript`, erreurs.length === 0)
  if (erreurs.length) console.log('   ', erreurs.join(' | '))
  await ctx.close()
}

// --- réseau coupé ----------------------------------------------------------
{
  const ctx = await nav.newContext({ ...devices['iPhone SE'] })
  const page = await ctx.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Commencer', exact: true }).click()
  await page.waitForTimeout(1800) // le service worker met tout en cache
  await ctx.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const tubes = await page.locator('.iro-tube').count()
  verifie('réseau coupé : le jeu se recharge et s’affiche', tubes > 0)

  // Et il reste JOUABLE : un versement doit passer sans réseau.
  const avant = await page.locator('.iro-unite').count()
  await page.locator('.iro-tube').nth(0).click()
  await page.waitForTimeout(200)
  for (let i = 1; i < tubes; i++) {
    await page.locator('.iro-tube').nth(i).click()
    await page.waitForTimeout(1300)
    if (await page.locator('.iro-unite').count() === avant) break
  }
  verifie('réseau coupé : on peut jouer un coup', await page.locator('.iro-titre span').innerText() !== '0 coup')
  await ctx.close()
}

verifie('aucune requête vers un serveur tiers', externes.length === 0)
if (externes.length) console.log('   ', externes.slice(0, 5).join(' | '))

await nav.close()
serveurLocal?.serveur.close()

console.log(`\n  garde-fou : ${ok} vérifications passées sur ${url}`)
console.log(`  captures dans captures/`)
if (echecs.length) {
  console.log(`  ${echecs.length} ÉCHECS :`)
  for (const e of echecs) console.log(`   ✗ ${e}`)
  process.exit(1)
}
