// Les icônes PNG de l'application, dérivées du seul favicon.svg.
// Aucune police n'est nécessaire : le dessin est purement vectoriel.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const ici = dirname(fileURLToPath(import.meta.url))
const pub = join(ici, '..', 'public')
const svg = readFileSync(join(pub, 'favicon.svg'))

const rendre = (taille) => sharp(svg, { density: 400 }).resize(taille, taille).png().toBuffer()

writeFileSync(join(pub, 'icone-192.png'), await rendre(192))
writeFileSync(join(pub, 'icone-512.png'), await rendre(512))

// La version « maskable » : le système peut rogner jusqu'à 20 % de chaque bord,
// donc le dessin est réduit et posé sur un fond plein.
const coeur = await sharp(svg, { density: 400 }).resize(328, 328).png().toBuffer()
const maskable = await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#0b0f14' },
})
  .composite([{ input: coeur, top: 92, left: 92 }])
  .png()
  .toBuffer()
writeFileSync(join(pub, 'icone-maskable.png'), maskable)

console.log('  icônes écrites : icone-192.png, icone-512.png, icone-maskable.png')
