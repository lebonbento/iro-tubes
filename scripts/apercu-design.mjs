import { chromium } from 'playwright'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const ici = dirname(fileURLToPath(import.meta.url))
const base = join(ici, '..', 'design')
const nav = await chromium.launch()
for (const d of ['fondations', 'composants']) {
  for (const f of readdirSync(join(base, d))) {
    const page = await nav.newPage({ viewport: { width: 900, height: 700 } })
    const erreurs = []
    page.on('pageerror', e => erreurs.push(e.message))
    await page.goto('file://' + join(base, d, f), { waitUntil: 'networkidle' })
    await page.waitForTimeout(250)
    const h = await page.evaluate(() => document.body.scrollHeight)
    await page.setViewportSize({ width: 900, height: Math.min(1600, Math.max(300, h + 40)) })
    await page.waitForTimeout(150)
    await page.screenshot({ path: join('/private/tmp/claude-501/-Users-florian/4f627f70-10d4-40a0-b0fd-1afef7d5b0ef/scratchpad', `ds-${d}-${f.replace('.html','')}.png`), fullPage: true })
    console.log(`${d}/${f} — hauteur ${h}px${erreurs.length ? ' ERREURS: ' + erreurs.join(' | ') : ''}`)
    await page.close()
  }
}
await nav.close()
