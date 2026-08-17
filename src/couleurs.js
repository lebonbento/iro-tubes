// IRO 色 — la palette, et son garde-fou daltonien.
//
// Un jeu dont TOUTE la règle est « même couleur » exclut de fait une partie des
// joueurs : environ un homme sur douze distingue mal le rouge du vert. Le mode
// « motifs » grave donc une forme distincte dans chaque unité. Ce n'est pas une
// option cosmétique, c'est la condition pour que le jeu soit jouable par tous.

export const PALETTE = [
  { nom: 'rouge', fond: '#f04747', clair: '#ff7b7b', sombre: '#b91c1c' },
  { nom: 'orange', fond: '#f97316', clair: '#fdba74', sombre: '#c2410c' },
  { nom: 'jaune', fond: '#eab308', clair: '#fde047', sombre: '#a16207' },
  { nom: 'lime', fond: '#84cc16', clair: '#bef264', sombre: '#4d7c0f' },
  { nom: 'vert', fond: '#22c55e', clair: '#86efac', sombre: '#15803d' },
  { nom: 'turquoise', fond: '#14b8a6', clair: '#5eead4', sombre: '#0f766e' },
  { nom: 'cyan', fond: '#22d3ee', clair: '#a5f3fc', sombre: '#0e7490' },
  { nom: 'bleu', fond: '#3b82f6', clair: '#93c5fd', sombre: '#1d4ed8' },
  { nom: 'violet', fond: '#8b5cf6', clair: '#c4b5fd', sombre: '#6d28d9' },
  { nom: 'fuchsia', fond: '#d946ef', clair: '#f0abfc', sombre: '#a21caf' },
  { nom: 'rose', fond: '#f43f5e', clair: '#fda4af', sombre: '#be123c' },
  { nom: 'ivoire', fond: '#e7e5e4', clair: '#ffffff', sombre: '#a8a29e' },
]

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
