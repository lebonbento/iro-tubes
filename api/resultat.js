import { entrer } from './_lib/comptes.js'
import { valider } from './_lib/rejeu.js'
import { sql } from './_lib/db.js'
import { corps, json, router } from './_lib/http.js'

export default router(async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erreur: 'Méthode non autorisée.' })
  const { pseudo, code, niveau, coups } = await corps(req)

  const verdict = valider(Number(niveau), coups)
  if (typeof verdict === 'string') return json(res, 400, { erreur: verdict })

  const joueur = await entrer(pseudo, code)

  await sql`
    insert into resultats (joueur_id, niveau, coups, parfait)
    values (${joueur.id}, ${Number(niveau)}, ${verdict.coups}, ${verdict.parfait})
    on conflict (joueur_id, niveau) do update
      set coups = least(resultats.coups, excluded.coups),
          parfait = resultats.parfait or excluded.parfait,
          maj_le = now()
  `

  const [total] = await sql`
    select count(*)::int as niveaux,
           coalesce(sum(coups), 0)::int as coups,
           count(*) filter (where parfait)::int as parfaits
    from resultats where joueur_id = ${joueur.id}
  `
  return json(res, 200, { enregistre: true, ...verdict, total })
})
