// L'accès à la base, avec un interrupteur.
//
// En production c'est Neon. En local, `npm run local` injecte un Postgres en
// mémoire (PGlite) : les MÊMES fichiers api/*.js tournent alors sans rien
// installer, et les tests jouent sur du vrai SQL. C'est la méthode qui a
// débloqué HEBI — sans elle, on ne teste jamais que des simulacres.

import { neon } from '@neondatabase/serverless'

let executer = null

/** Branche une autre base (les tests locaux s'en servent). */
export function utiliserBase(fn) {
  executer = fn
}

export function sql(morceaux, ...valeurs) {
  if (executer) return executer(morceaux, ...valeurs)
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL absente')
  executer = neon(url)
  return executer(morceaux, ...valeurs)
}
