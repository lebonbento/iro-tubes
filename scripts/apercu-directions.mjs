import { chromium } from 'playwright'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const base = join(dirname(fileURLToPath(import.meta.url)), '..', 'design', 'directions')
const nav = await chromium.launch()
for (const f of readdirSync(base)) {
  const page = await nav.newPage({ viewport: { width: 1180, height: 800 }, deviceScaleFactor: 2 })
  const err = []
  page.on('pageerror', e => err.push(e.message))
  await page.goto('file://' + join(base, f), { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `/private/tmp/claude-501/-Users-florian/4f627f70-10d4-40a0-b0fd-1afef7d5b0ef/scratchpad/da-${f.replace('.html','')}.png` })
  console.log(f, err.length ? 'ERREURS: ' + err.join(' | ') : 'ok')
  await page.close()
}
await nav.close()
