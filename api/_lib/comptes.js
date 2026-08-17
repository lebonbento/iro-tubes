// Comptes : un pseudo, un code à 4 chiffres. Rien d'autre, aucune donnée
// personnelle.
//
// Un code à 4 chiffres, c'est 10 000 possibilités : sans frein, on le devine en
// quelques secondes. D'où les trois garde-fous, tous appris sur HEBI :
//   1. Le code n'est jamais stocké : on garde une empreinte scrypt, salée avec
//      un secret d'environnement ET le pseudo (deux joueurs au même code n'ont
//      donc pas la même empreinte).
//   2. Sans ce secret, l'API REFUSE de fonctionner (503) au lieu de retomber sur
//      une valeur en dur. Échouer fermé.
//   3. Cinq échecs ferment le compte 15 minutes.

import { scryptSync, timingSafeEqual } from 'node:crypto'
import { sql } from './db.js'

const ECHECS_TOLERES = 5
const BLOCAGE_MINUTES = 15

export class Refus extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

function sel() {
  const s = process.env.IRO_SEL
  if (!s || s.length < 16) {
    throw new Refus(503, 'Le classement est momentanément indisponible.')
  }
  return s
}

export function nettoyerPseudo(brut) {
  const p = String(brut ?? '').trim().toUpperCase().replace(/\s+/g, ' ')
  if (!/^[A-Z0-9ÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ' -]{2,14}$/.test(p)) {
    throw new Refus(400, 'Pseudo : 2 à 14 lettres ou chiffres.')
  }
  return p
}

export function nettoyerCode(brut) {
  const c = String(brut ?? '').trim()
  if (!/^[0-9]{4}$/.test(c)) throw new Refus(400, 'Le code fait exactement 4 chiffres.')
  return c
}

const empreinte = (pseudo, code) => scryptSync(code, `${sel()}:${pseudo}`, 32).toString('hex')

function memeEmpreinte(a, b) {
  const x = Buffer.from(a, 'hex')
  const y = Buffer.from(b, 'hex')
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Ouvre le compte s'il existe, le crée sinon. Renvoie { id, pseudo, nouveau }.
 */
export async function entrer(pseudoBrut, codeBrut) {
  const pseudo = nettoyerPseudo(pseudoBrut)
  const code = nettoyerCode(codeBrut)
  const attendu = empreinte(pseudo, code)

  const [existant] = await sql`
    select id, code_hache, echecs, bloque_jusqu_a from joueurs where pseudo = ${pseudo}
  `
  if (!existant) {
    const [cree] = await sql`
      insert into joueurs (pseudo, code_hache) values (${pseudo}, ${attendu}) returning id
    `
    return { id: cree.id, pseudo, nouveau: true }
  }

  if (existant.bloque_jusqu_a && new Date(existant.bloque_jusqu_a) > new Date()) {
    throw new Refus(429, `Trop d’essais. Réessayez dans ${BLOCAGE_MINUTES} minutes.`)
  }

  if (!memeEmpreinte(existant.code_hache, attendu)) {
    const echecs = existant.echecs + 1
    if (echecs >= ECHECS_TOLERES) {
      await sql`
        update joueurs set echecs = 0,
          bloque_jusqu_a = now() + make_interval(mins => ${BLOCAGE_MINUTES})
        where id = ${existant.id}
      `
      throw new Refus(429, `Trop d’essais. Réessayez dans ${BLOCAGE_MINUTES} minutes.`)
    }
    await sql`update joueurs set echecs = ${echecs} where id = ${existant.id}`
    throw new Refus(401, 'Ce pseudo existe déjà avec un autre code.')
  }

  await sql`update joueurs set echecs = 0, bloque_jusqu_a = null where id = ${existant.id}`
  return { id: existant.id, pseudo, nouveau: false }
}
