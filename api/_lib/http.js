import { Refus } from './comptes.js'

export function json(res, code, corps) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(corps))
}

export async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const morceaux = []
  for await (const m of req) morceaux.push(m)
  if (morceaux.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(morceaux).toString('utf8'))
  } catch {
    return {}
  }
}

/** Enveloppe commune : une erreur attendue reste lisible, une inattendue reste muette. */
export function router(traiter) {
  return async (req, res) => {
    try {
      await traiter(req, res)
    } catch (erreur) {
      if (erreur instanceof Refus) return json(res, erreur.code, { erreur: erreur.message })
      console.error(erreur)
      return json(res, 500, { erreur: 'Erreur interne.' })
    }
  }
}
