// IRO 色 — la palette, et son garde-fou daltonien.
//
// Un jeu dont TOUTE la règle est « même couleur » exclut de fait une partie des
// joueurs : environ un homme sur douze distingue mal le rouge du vert. Le mode
// « motifs » grave donc une forme distincte dans chaque unité. Ce n'est pas une
// option cosmétique, c'est la condition pour que le jeu soit jouable par tous.

// Les douze teintes, DANS L'ORDRE DE LA ROUE.
//
// ⚠️ La roue boucle : la première et la dernière sont voisines. C'est ce qui
// avait donné « deux rouges » — un rouge en tête et un rose en queue, séparés
// par ΔE 7 seulement, c'est-à-dire à peine perceptible.
//
// 🔑 Ces valeurs sont SOURDES par construction, pas par retouche. La direction
// « Laque » demande des gemmes éteintes ; désaturer la palette vive au rendu
// faisait tomber l'écart minimal à ΔE 15,9 — deux couleurs devenaient
// indépartageables, et c'est la RÈGLE du jeu qui cassait, pas seulement le goût.
// La recherche a donc été refaite directement dans l'espace sourd
// (saturation 0,34–0,58) : ΔE minimal 22,6, aussi bon que la palette vive.
// ⚠️ Ne jamais réintroduire une désaturation au rendu : elle se cumulerait.
//
// `npm run test-palette` remesure tout et refuse en dessous de ΔE 22.
const TEINTES = [
  ['brique', '#a93e2d'],
  ['ambre', '#d08a4e'],
  ['vieil or', '#c5bc34'],
  ['vert', '#4ba136'],
  ['jade', '#86dfb5'],
  ['sarcelle', '#479086'],
  ['givre', '#86c1df'],
  ['bleu', '#4e79d0'],
  ['prune', '#562da9'],
  ['mauve', '#ba6ad7'],
  ['cassis', '#a92d6f'],
  ['dragée', '#cd98a3'],
]

// Le dégradé de chaque unité se déduit du fond : une seule valeur à régler par
// couleur, et aucune chance qu'un clair et un sombre se contredisent.
const versHsl = (hex) => {
  const [r, v, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, v, b)
  const min = Math.min(r, v, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r) h = ((v - b) / d) % 6
  else if (max === v) h = (b - r) / d + 2
  else h = (r - v) / d + 4
  return [(h * 60 + 360) % 360, s, l]
}

const versHex = (h, s, l) => {
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
    return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export const PALETTE = TEINTES.map(([nom, fond]) => {
  const [h, s, l] = versHsl(fond)
  return {
    nom,
    fond,
    // Une gemme : l'éclat du haut est plus PÂLE que saturé, le fond plus sombre
    // à saturation égale. C'est ce qui donne la pierre plutôt que le bonbon.
    clair: versHex(h, s * 0.62, Math.min(0.92, l + 0.15)),
    sombre: versHex(h, s, Math.max(0.1, l - 0.17)),
  }
})

/**
 * Une forme par couleur, dessinée dans un carré de 100×100 centré.
 * Elles sont choisies pour rester lisibles à 12 px de côté : pas de détail fin.
 */
export const MOTIFS = [
  'M50 18 L82 74 L18 74 Z',                                    // triangle haut
  'M50 82 L18 26 L82 26 Z',                                    // triangle bas
  'M26 26 H74 V74 H26 Z',                                      // carré
  'M50 16 L84 50 L50 84 L16 50 Z',                             // losange
  'M50 20 A30 30 0 1 1 49.9 20 Z',                             // disque
  'M50 22 A28 28 0 1 1 49.9 22 Z M50 36 A14 14 0 1 0 50.1 36 Z', // anneau
  'M42 18 H58 V42 H82 V58 H58 V82 H42 V58 H18 V42 H42 Z',      // croix
  'M28 22 L50 44 L72 22 L78 28 L56 50 L78 72 L72 78 L50 56 L28 78 L22 72 L44 50 L22 28 Z', // sautoir
  'M50 14 L61 40 L88 42 L67 60 L74 86 L50 71 L26 86 L33 60 L12 42 L39 40 Z', // étoile
  'M50 14 L82 32 V68 L50 86 L18 68 V32 Z',                     // hexagone
  'M20 40 H80 V60 H20 Z',                                      // barre
  'M50 84 C22 62 22 34 38 26 C46 22 50 30 50 34 C50 30 54 22 62 26 C78 34 78 62 50 84 Z', // goutte
]

export const couleur = (i) => PALETTE[i % PALETTE.length]
export const motif = (i) => MOTIFS[i % MOTIFS.length]

/**
 * Quelles teintes utiliser pour un niveau à `n` couleurs.
 *
 * Prendre bêtement les `n` premières donnait un niveau 1 en rouge / orange /
 * jaune : trois voisines de la roue, impossibles à départager d'un coup d'œil.
 * On les répartit donc sur toute la roue — à 3 couleurs on joue rouge, vert et
 * violet. L'écart est maximal quand le jeu est facile, et il ne se resserre
 * qu'au fur et à mesure que le joueur s'aguerrit.
 */
export function repartition(n) {
  const pas = PALETTE.length / n
  return Array.from({ length: n }, (_, i) => Math.round(i * pas) % PALETTE.length)
}
