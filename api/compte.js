import { entrer } from './_lib/comptes.js'
import { corps, json, router } from './_lib/http.js'

export default router(async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erreur: 'Méthode non autorisée.' })
  const { pseudo, code } = await corps(req)
  const joueur = await entrer(pseudo, code)
  return json(res, 200, { pseudo: joueur.pseudo, nouveau: joueur.nouveau })
})
