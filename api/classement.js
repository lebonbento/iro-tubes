import { sql } from './_lib/db.js'
import { json, router } from './_lib/http.js'
import { nettoyerPseudo } from './_lib/comptes.js'

// Le classement se lit sans compte : on ne demande jamais le code ici.
export default router(async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { erreur: 'Méthode non autorisée.' })

  const url = new URL(req.url, 'http://x')
  let moiPseudo = null
  try {
    if (url.searchParams.get('pseudo')) moiPseudo = nettoyerPseudo(url.searchParams.get('pseudo'))
  } catch {
    moiPseudo = null // un pseudo invalide n'empêche pas de lire le classement
  }

  // Le classement se lit d'abord au NOMBRE DE NIVEAUX finis, puis au total de
  // coups (moins il y en a, mieux c'est), puis aux niveaux joués au minimum.
  const lignes = await sql`
    select j.pseudo,
           count(r.niveau)::int as niveaux,
           coalesce(sum(r.coups), 0)::int as coups,
           count(*) filter (where r.parfait)::int as parfaits,
           rank() over (
             order by count(r.niveau) desc, coalesce(sum(r.coups), 0) asc, count(*) filter (where r.parfait) desc
           )::int as rang
    from joueurs j
    join resultats r on r.joueur_id = j.id
    group by j.id, j.pseudo
    order by rang asc
    limit 200
  `

  const moi = moiPseudo ? lignes.find((l) => l.pseudo === moiPseudo) ?? null : null
  return json(res, 200, { classement: lignes.slice(0, 100), moi })
})
