import { sql } from './_lib/db.js'
import { corps, json, router } from './_lib/http.js'

// Recueillir un avis ne demande AUCUN compte : exiger une inscription pour
// pouvoir râler, c'est s'assurer que personne ne râle. On garde le niveau en
// cours et l'appareil, parce que « ça rame » ou « c'est moche » ne veut rien
// dire sans savoir où ni sur quoi.
export default router(async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erreur: 'Méthode non autorisée.' })
  const { pseudo, texte, niveau, coups, appareil } = await corps(req)

  const message = String(texte ?? '').trim()
  if (message.length < 2) return json(res, 400, { erreur: 'Dites-en un peu plus.' })
  if (message.length > 1000) return json(res, 400, { erreur: 'Message trop long.' })

  await sql`
    insert into avis (pseudo, niveau, coups, appareil, texte)
    values (
      ${pseudo ? String(pseudo).slice(0, 14) : null},
      ${Number.isInteger(niveau) ? niveau : null},
      ${Number.isInteger(coups) ? coups : null},
      ${appareil ? String(appareil).slice(0, 200) : null},
      ${message}
    )
  `
  return json(res, 200, { recu: true })
})
