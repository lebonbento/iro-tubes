// Trois bruits, faits à la main : aucun fichier à télécharger, rien à charger
// hors ligne. Le contexte audio n'est créé qu'au premier geste du joueur, sinon
// iOS le refuse.

let contexte = null

function ouvrir() {
  if (contexte) return contexte
  const Ctx = window.AudioContext ?? window.webkitAudioContext
  if (!Ctx) return null
  contexte = new Ctx()
  return contexte
}

function note({ frequence, duree = 0.14, volume = 0.06, forme = 'sine', glisse = 0 }) {
  const ctx = ouvrir()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = forme
  o.frequency.setValueAtTime(frequence, ctx.currentTime)
  if (glisse) o.frequency.exponentialRampToValueAtTime(frequence * glisse, ctx.currentTime + duree)
  g.gain.setValueAtTime(0.0001, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duree)
  o.connect(g).connect(ctx.destination)
  o.start()
  o.stop(ctx.currentTime + duree + 0.02)
}

/** Le versement : la note MONTE avec le remplissage, comme une vraie bouteille. */
export const sonVersement = (n) => note({ frequence: 280, glisse: 1 + 0.14 * n, duree: 0.1 + 0.05 * n, forme: 'triangle', volume: 0.05 })
export const sonTubeFini = () => { note({ frequence: 660, duree: 0.12, volume: 0.05 }); setTimeout(() => note({ frequence: 880, duree: 0.16, volume: 0.05 }), 90) }
export const sonVictoire = () => [0, 120, 240, 400].forEach((d, i) => setTimeout(() => note({ frequence: [523, 659, 784, 1047][i], duree: 0.22, volume: 0.05 }), d))
export const sonRefus = () => note({ frequence: 150, duree: 0.09, volume: 0.04, forme: 'square' })
