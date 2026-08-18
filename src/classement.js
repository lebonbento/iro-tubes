// Le classement, côté joueur.
//
// Deux principes :
//   — le code à 4 chiffres reste sur l'appareil, il n'est jamais affiché ;
//   — un résultat qui ne part pas (avion, métro, serveur en panne) est MIS DE
//     CÔTÉ et repart plus tard. Le jeu est hors-ligne : perdre un niveau fini
//     parce qu'il n'y avait pas de réseau serait la pire des trahisons.

const CLE_COMPTE = 'iro-compte'
const CLE_FILE = 'iro-en-attente'

const lireJSON = (cle, defaut) => {
  try {
    return JSON.parse(localStorage.getItem(cle)) ?? defaut
  } catch {
    return defaut
  }
}
const ecrireJSON = (cle, valeur) => {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur))
  } catch { /* stockage indisponible : on continue sans mémoire */ }
}

export const compte = () => lireJSON(CLE_COMPTE, null)
export const enAttente = () => lireJSON(CLE_FILE, [])
export const oublierCompte = () => localStorage.removeItem(CLE_COMPTE)

async function appeler(route, options) {
  const reponse = await fetch(route, options)
  let corps = {}
  try {
    corps = await reponse.json()
  } catch {
    // Une réponse HTML ici veut dire que le service worker a servi la page à la
    // place du JSON. C'est le piège `navigateFallbackDenylist`.
    throw new Error('Réponse illisible du serveur.')
  }
  if (!reponse.ok) throw new Error(corps.erreur ?? 'Le serveur a refusé.')
  return corps
}

export async function connecter(pseudo, code) {
  const resultat = await appeler('/api/compte', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pseudo, code }),
  })
  ecrireJSON(CLE_COMPTE, { pseudo: resultat.pseudo, code })
  return resultat
}

/** Envoie un résultat ; en cas d'échec il est gardé pour plus tard. */
export async function envoyer(niveau, coups) {
  const c = compte()
  if (!c) return { ignore: true }
  try {
    return await appeler('/api/resultat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pseudo: c.pseudo, code: c.code, niveau, coups }),
    })
  } catch (erreur) {
    const file = enAttente().filter((x) => x.niveau !== niveau)
    file.push({ niveau, coups })
    ecrireJSON(CLE_FILE, file.slice(-60))
    return { differe: true, raison: erreur.message }
  }
}

/** Rejoue la file d'attente. Appelé au lancement et après chaque victoire. */
export async function viderLaFile() {
  const c = compte()
  const file = enAttente()
  if (!c || file.length === 0) return 0
  const restants = []
  let partis = 0
  for (const item of file) {
    try {
      await appeler('/api/resultat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pseudo: c.pseudo, code: c.code, ...item }),
      })
      partis++
    } catch {
      restants.push(item)
    }
  }
  ecrireJSON(CLE_FILE, restants)
  return partis
}

/**
 * Envoie un avis. Volontairement sans compte ni file d'attente : c'est un
 * message ponctuel, pas un résultat de partie qu'on aurait le droit de perdre.
 */
export async function envoyerAvis(texte, contexte) {
  const c = compte()
  return appeler('/api/avis', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      texte,
      pseudo: c?.pseudo ?? null,
      niveau: contexte?.niveau ?? null,
      coups: contexte?.coups ?? null,
      appareil: navigator.userAgent.slice(0, 200),
    }),
  })
}

export async function lireClassement() {
  const c = compte()
  const q = c ? `?pseudo=${encodeURIComponent(c.pseudo)}` : ''
  return appeler(`/api/classement${q}`, { method: 'GET' })
}
