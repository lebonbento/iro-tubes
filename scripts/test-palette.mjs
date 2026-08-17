// La palette doit rester DÉPARTAGEABLE.
//
// Tout le jeu consiste à dire « ces deux-là sont de la même couleur ». Deux
// teintes trop voisines ne sont pas un défaut d'esthétique, c'est un défaut de
// règle : le joueur ne peut plus jouer. On ne juge donc pas à l'œil, on mesure
// l'écart perceptuel (CIEDE2000) entre toutes les paires, et on refuse en
// dessous d'un seuil.
//
// Repères : 1 = limite du perceptible, 10 = nettement différent au premier
// coup d'œil. On exige 22 entre deux couleurs du même plateau.

import { PALETTE, repartition } from '../src/couleurs.js'

const SEUIL = 22

const versLab = (hex) => {
  const canal = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const [r, v, b] = [canal(1), canal(3), canal(5)]
  const X = (r * 0.4124 + v * 0.3576 + b * 0.1805) / 0.95047
  const Y = r * 0.2126 + v * 0.7152 + b * 0.0722
  const Z = (r * 0.0193 + v * 0.1192 + b * 0.9505) / 1.08883
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]
}

function ecart([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180
  const C1 = Math.hypot(a1, b1)
  const C2 = Math.hypot(a2, b2)
  const Cm = (C1 + C2) / 2
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)))
  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2
  const C1p = Math.hypot(a1p, b1)
  const C2p = Math.hypot(a2p, b2)
  const angle = (b, a) => {
    if (b === 0 && a === 0) return 0
    const h = Math.atan2(b, a) / rad
    return h < 0 ? h + 360 : h
  }
  const h1p = angle(b1, a1p)
  const h2p = angle(b2, a2p)

  const dLp = L2 - L1
  const dCp = C2p - C1p
  let dhp = 0
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p
    if (dhp > 180) dhp -= 360
    else if (dhp < -180) dhp += 360
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * rad) / 2)

  const Lm = (L1 + L2) / 2
  const Cmp = (C1p + C2p) / 2
  let hm
  if (C1p * C2p === 0) hm = h1p + h2p
  else if (Math.abs(h1p - h2p) <= 180) hm = (h1p + h2p) / 2
  else hm = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2

  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad)
    + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad)
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2))
  const Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7))
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2)
  const Sc = 1 + 0.045 * Cmp
  const Sh = 1 + 0.015 * Cmp * T
  const Rt = -Math.sin(2 * dTheta * rad) * Rc

  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
  )
}

const labs = PALETTE.map((c) => versLab(c.fond))

const paires = []
for (let i = 0; i < PALETTE.length; i++) {
  for (let j = i + 1; j < PALETTE.length; j++) {
    paires.push({ i, j, d: ecart(labs[i], labs[j]) })
  }
}
paires.sort((a, b) => a.d - b.d)

console.log('\n  Les 6 paires les plus proches de la palette :')
for (const p of paires.slice(0, 6)) {
  const marque = p.d < SEUIL ? '  ✗' : '  ✓'
  console.log(`${marque} ${PALETTE[p.i].nom.padEnd(10)} / ${PALETTE[p.j].nom.padEnd(10)} ΔE ${p.d.toFixed(1)}`)
}

const fautives = paires.filter((p) => p.d < SEUIL)

// Le contrôle qui compte vraiment : chaque niveau ne prend qu'un sous-ensemble
// de la palette, et c'est CE sous-ensemble qui doit être lisible.
let pireNiveau = { n: null, d: Infinity }
for (let n = 3; n <= PALETTE.length; n++) {
  const choisies = repartition(n)
  if (new Set(choisies).size !== n) {
    console.log(`  ✗ à ${n} couleurs, la répartition en donne deux fois la même`)
    process.exit(1)
  }
  for (let i = 0; i < choisies.length; i++) {
    for (let j = i + 1; j < choisies.length; j++) {
      const d = ecart(labs[choisies[i]], labs[choisies[j]])
      if (d < pireNiveau.d) pireNiveau = { n, d, paire: [choisies[i], choisies[j]] }
    }
  }
}
console.log(`\n  Pire écart rencontré dans une partie : ΔE ${pireNiveau.d.toFixed(1)} `
  + `(${PALETTE[pireNiveau.paire[0]].nom} / ${PALETTE[pireNiveau.paire[1]].nom}, à ${pireNiveau.n} couleurs)`)

if (fautives.length) {
  console.log(`\n  ${fautives.length} paire(s) sous le seuil de ${SEUIL} : indépartageables en jeu.`)
  process.exit(1)
}
console.log(`  ✓ les ${PALETTE.length} couleurs sont toutes séparées d’au moins ΔE ${SEUIL}`)
