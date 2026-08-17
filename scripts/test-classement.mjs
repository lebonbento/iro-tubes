// Le classement, testé sur du vrai SQL et à travers de vraies requêtes HTTP.
//
// L'enjeu principal : prouver qu'on ne peut PAS s'inscrire au classement sans
// avoir résolu le casse-tête. Le serveur rejoue la partie ; ce test lui envoie
// donc de vraies solutions, des fausses, et des tricheries.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { demarrer } from './serveur-local.mjs'
import { chercherSolutionOptimale, chercherUneSolution } from '../src/solveur.js'

process.env.IRO_SEL = 'sel-de-test-suffisamment-long-0123456789'

const ici = dirname(fileURLToPath(import.meta.url))
const { niveaux } = JSON.parse(readFileSync(join(ici, '..', 'src', 'niveaux.json'), 'utf8'))

let ok = 0
const echecs = []
const verifie = (nom, condition) => (condition ? ok++ : echecs.push(nom))

const { serveur, url } = await demarrer(4332)
const poste = async (route, corps) => {
  const r = await fetch(`${url}${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corps),
  })
  return { statut: r.status, corps: await r.json() }
}
const lit = async (route) => {
  const r = await fetch(`${url}${route}`)
  return { statut: r.status, corps: await r.json() }
}

// --- comptes ---------------------------------------------------------------
let r = await poste('/api/compte', { pseudo: 'flo', code: '1234' })
verifie('création de compte', r.statut === 200 && r.corps.nouveau === true)
verifie('le pseudo est normalisé en majuscules', r.corps.pseudo === 'FLO')

r = await poste('/api/compte', { pseudo: 'FLO', code: '1234' })
verifie('reconnexion avec le bon code', r.statut === 200 && r.corps.nouveau === false)

r = await poste('/api/compte', { pseudo: 'FLO', code: '9999' })
verifie('mauvais code refusé', r.statut === 401)

r = await poste('/api/compte', { pseudo: 'x', code: '1234' })
verifie('pseudo trop court refusé', r.statut === 400)
r = await poste('/api/compte', { pseudo: 'BOBBY', code: '12' })
verifie('code à 2 chiffres refusé', r.statut === 400)
r = await poste('/api/compte', { pseudo: 'BOBBY', code: 'abcd' })
verifie('code non numérique refusé', r.statut === 400)

// --- frein anti-force-brute ------------------------------------------------
await poste('/api/compte', { pseudo: 'CIBLE', code: '1111' })
let bloque = false
for (let i = 0; i < 6; i++) {
  const essai = await poste('/api/compte', { pseudo: 'CIBLE', code: '0000' })
  if (essai.statut === 429) bloque = true
}
verifie('5 échecs ferment le compte (429)', bloque)
r = await poste('/api/compte', { pseudo: 'CIBLE', code: '1111' })
verifie('même le BON code est refusé pendant le blocage', r.statut === 429)

// --- échouer fermé ---------------------------------------------------------
const selGarde = process.env.IRO_SEL
delete process.env.IRO_SEL
r = await poste('/api/compte', { pseudo: 'FLO', code: '1234' })
verifie('sans secret d’environnement : 503, pas de repli en dur', r.statut === 503)
process.env.IRO_SEL = selGarde

// --- résultats : le serveur rejoue -----------------------------------------
const niveau1 = niveaux[0]
const optimale = chercherSolutionOptimale(niveau1.etat, niveau1.hauteur, 900000)

r = await poste('/api/resultat', { pseudo: 'FLO', code: '1234', niveau: 1, coups: optimale })
verifie('une vraie solution est acceptée', r.statut === 200 && r.corps.enregistre)
verifie('la solution minimale est marquée « parfaite »', r.corps.parfait === true)
verifie('le total est renvoyé', r.corps.total.niveaux === 1 && r.corps.total.coups === optimale.length)

// Le niveau 3 se résout en 10 coups au minimum, mais le moteur rapide en trouve
// une version en 12 : de quoi vérifier que le MEILLEUR score est bien conservé.
const niveau3 = niveaux[2]
const court3 = chercherSolutionOptimale(niveau3.etat, niveau3.hauteur, 900000)
const long3 = chercherUneSolution(niveau3.etat, niveau3.hauteur, 400000)
verifie('le test dispose bien d’une solution plus longue', long3.length > court3.length)

await poste('/api/resultat', { pseudo: 'FLO', code: '1234', niveau: 3, coups: court3 })
r = await poste('/api/resultat', { pseudo: 'FLO', code: '1234', niveau: 3, coups: long3 })
verifie('un moins bon score ne dégrade pas le meilleur',
  r.corps.total.coups === optimale.length + court3.length)

r = await poste('/api/resultat', { pseudo: 'FLO', code: '1234', niveau: 1, coups: optimale })
verifie('rejouer le même niveau ne le compte pas deux fois', r.corps.total.niveaux === 2)

// --- tricheries ------------------------------------------------------------
r = await poste('/api/resultat', { pseudo: 'FLO', code: '1234', niveau: 1, coups: [[0, 1]] })
verifie('une partie non terminée est refusée', r.statut === 400)

r = await poste('/api/resultat', { pseudo: 'FLO', code: '1234', niveau: 1, coups: optimale.slice(0, -1) })
verifie('une solution tronquée est refusée', r.statut === 400)

r = await poste('/api/resultat', { pseudo: 'FLO', code: '1234', niveau: 1, coups: [[0, 0], [1, 2]] })
verifie('un coup illégal est refusé', r.statut === 400)

r = await poste('/api/resultat', { pseudo: 'FLO', code: '1234', niveau: 1, coups: [[0, 99]] })
verifie('un tube hors plateau est refusé', r.statut === 400)

r = await poste('/api/resultat', { pseudo: 'FLO', code: '1234', niveau: 9999, coups: optimale })
verifie('un niveau inexistant est refusé', r.statut === 400)

r = await poste('/api/resultat', { pseudo: 'FLO', code: '0000', niveau: 1, coups: optimale })
verifie('un résultat sans le bon code est refusé', r.statut === 401)

// Le cœur de l'affaire : la solution du niveau 1 ne vaut pas pour le niveau 2.
r = await poste('/api/resultat', { pseudo: 'FLO', code: '1234', niveau: 2, coups: optimale })
verifie('la solution d’un autre niveau est refusée', r.statut === 400)

// --- classement ------------------------------------------------------------
await poste('/api/compte', { pseudo: 'MIKI', code: '4321' })
for (const n of [1, 2, 3]) {
  const niveau = niveaux[n - 1]
  const sol = chercherSolutionOptimale(niveau.etat, niveau.hauteur, 900000)
  const rep = await poste('/api/resultat', { pseudo: 'MIKI', code: '4321', niveau: n, coups: sol })
  verifie(`MIKI enregistre le niveau ${n}`, rep.statut === 200)
}

r = await lit('/api/classement?pseudo=FLO')
verifie('le classement se lit sans code', r.statut === 200)
verifie('celui qui a fini le plus de niveaux est premier',
  r.corps.classement[0].pseudo === 'MIKI' && r.corps.classement[0].rang === 1)
verifie('les niveaux sont comptés', r.corps.classement[0].niveaux === 3)
verifie('le joueur retrouve sa propre ligne', r.corps.moi?.pseudo === 'FLO' && r.corps.moi.rang === 2)
verifie('les « parfaits » sont comptés', r.corps.classement[0].parfaits >= 1)

r = await lit('/api/classement?pseudo=INCONNU')
verifie('un pseudo inconnu ne casse pas la lecture', r.statut === 200 && r.corps.moi === null)

serveur.close()

console.log(`\n  classement : ${ok} vérifications passées`)
if (echecs.length) {
  console.log(`  ${echecs.length} ÉCHECS :`)
  for (const e of echecs) console.log(`   ✗ ${e}`)
  process.exit(1)
}
