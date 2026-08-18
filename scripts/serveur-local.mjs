// Le jeu complet en local, API comprise, sur un Postgres en mémoire.
//
// Ce serveur charge les MÊMES fichiers api/*.js que la production et leur
// branche PGlite au lieu de Neon. Aucune base à installer, aucun compte, et les
// tests jouent sur du vrai SQL — pas sur une imitation.
//
//   npm run local            -> http://localhost:4331

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, normalize } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { utiliserBase } from '../api/_lib/db.js'
import { SCHEMA } from '../api/_lib/schema.js'

const ici = dirname(fileURLToPath(import.meta.url))
const racine = join(ici, '..', 'dist')

export async function demarrer(port = 4331) {
  const base = new PGlite()
  for (const instruction of SCHEMA) await base.query(instruction)

  utiliserBase(async (morceaux, ...valeurs) => {
    let texte = ''
    morceaux.forEach((m, i) => {
      texte += m
      if (i < valeurs.length) texte += `$${i + 1}`
    })
    const { rows } = await base.query(texte, valeurs)
    return rows
  })

  const routes = {
    '/api/compte': (await import('../api/compte.js')).default,
    '/api/resultat': (await import('../api/resultat.js')).default,
    '/api/classement': (await import('../api/classement.js')).default,
    '/api/avis': (await import('../api/avis.js')).default,
  }

  const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.webmanifest': 'application/manifest+json',
  }

  const serveur = createServer(async (req, res) => {
    const chemin = new URL(req.url, 'http://x').pathname
    const traiter = routes[chemin]
    if (traiter) return traiter(req, res)

    const relatif = normalize(chemin === '/' ? '/index.html' : chemin).replace(/^(\.\.[/\\])+/, '')
    try {
      const contenu = await readFile(join(racine, relatif))
      res.setHeader('content-type', types[extname(relatif)] ?? 'application/octet-stream')
      res.end(contenu)
    } catch {
      try {
        res.setHeader('content-type', 'text/html; charset=utf-8')
        res.end(await readFile(join(racine, 'index.html')))
      } catch {
        res.statusCode = 404
        res.end('introuvable')
      }
    }
  })

  await new Promise((ok) => serveur.listen(port, ok))
  return { serveur, base, url: `http://localhost:${port}` }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.env.IRO_SEL ??= 'sel-de-developpement-uniquement-32o'
  const { url } = await demarrer()
  console.log(`  IRO en local (API comprise) : ${url}`)
}
