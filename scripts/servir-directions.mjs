// Sert les trois directions artistiques, chacune sur son adresse.
//
// Trois ports plutôt qu'une page à onglets : on compare en basculant entre
// trois fenêtres, et surtout on peut ouvrir CHACUNE sur le téléphone — c'est
// dans la main que se juge une direction, pas dans une maquette sur un Mac.
//
//   npm run servir-directions

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const base = join(dirname(fileURLToPath(import.meta.url)), '..', 'design', 'directions')

const DIRECTIONS = [
  { nom: 'Laboratoire', fichier: 'laboratoire.html', port: 4401 },
  { nom: 'Washi', fichier: 'washi.html', port: 4402 },
  { nom: 'Laque', fichier: 'laque.html', port: 4403 },
]

/** L'adresse du Mac sur le réseau local, pour ouvrir depuis le téléphone. */
function adresseLocale() {
  for (const cartes of Object.values(networkInterfaces())) {
    for (const c of cartes ?? []) {
      if (c.family === 'IPv4' && !c.internal) return c.address
    }
  }
  return null
}

const ip = adresseLocale()

for (const d of DIRECTIONS) {
  const serveur = createServer(async (req, res) => {
    try {
      const html = await readFile(join(base, d.fichier))
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.setHeader('cache-control', 'no-store')
      res.end(html)
    } catch {
      res.statusCode = 500
      res.end('Page absente — lancer `npm run directions` d’abord.')
    }
  })
  // 0.0.0.0 et pas localhost : sinon le téléphone ne peut pas se connecter.
  serveur.listen(d.port, '0.0.0.0')
}

console.log('\n  Les trois directions d’IRO :\n')
for (const d of DIRECTIONS) {
  console.log(`  ${d.nom.padEnd(13)} http://localhost:${d.port}`
    + (ip ? `   ·   téléphone : http://${ip}:${d.port}` : ''))
}
console.log('\n  Un sélecteur en bas de chaque page permet de sauter aux deux autres.')
console.log('  Pour arrêter : npm run stop-directions\n')
