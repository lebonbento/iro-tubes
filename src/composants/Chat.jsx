/**
 * Le chat d'IRO.
 *
 * Dessiné en SVG et non en image : le jeu doit rester jouable hors-ligne et
 * peser trois fois rien. Aucun fichier à télécharger, et il reste net à
 * n'importe quelle taille.
 *
 * `humeur` : 'assis' pendant la partie, 'content' quand on a gagné.
 */
export default function Chat({ taille = 76, humeur = 'assis', couleur = '#e8dcc4' }) {
  const oreille = '#d79aa6'
  const trait = 'rgba(0,0,0,.45)'
  return (
    <svg
      className={`iro-chat est-${humeur}`}
      width={taille}
      height={taille}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      {/* la queue, qui balaie doucement */}
      <path
        className="iro-queue"
        d="M74 84 C90 82 92 66 84 60"
        fill="none"
        stroke={couleur}
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* le corps */}
      <path d="M28 88 C28 66 38 56 50 56 C62 56 72 66 72 88 Z" fill={couleur} />
      {/* les pattes avant */}
      <ellipse cx="40" cy="86" rx="7" ry="5" fill="#fff" opacity=".5" />
      <ellipse cx="60" cy="86" rx="7" ry="5" fill="#fff" opacity=".5" />
      {/* les oreilles */}
      <path d="M27 40 L30 20 L45 31 Z" fill={couleur} />
      <path d="M73 40 L70 20 L55 31 Z" fill={couleur} />
      <path d="M31 37 L32.5 27 L40 32.5 Z" fill={oreille} />
      <path d="M69 37 L67.5 27 L60 32.5 Z" fill={oreille} />
      {/* la tête */}
      <ellipse cx="50" cy="44" rx="24" ry="21" fill={couleur} />
      {/* les yeux, qui clignent */}
      <g className="iro-yeux" fill={trait}>
        <ellipse cx="41" cy="43" rx="3.1" ry="3.6" />
        <ellipse cx="59" cy="43" rx="3.1" ry="3.6" />
      </g>
      {/* le museau */}
      <path d="M50 50 l-3.4 -2.6 h6.8 Z" fill={oreille} />
      <path d="M50 50 v3 M50 53 q-4 3 -7 0 M50 53 q4 3 7 0"
        fill="none" stroke={trait} strokeWidth="1.5" strokeLinecap="round" />
      {/* les moustaches */}
      <g stroke={trait} strokeWidth="1.2" strokeLinecap="round" opacity=".55">
        <path d="M34 48 L22 45" /><path d="M34 51 L22 52" />
        <path d="M66 48 L78 45" /><path d="M66 51 L78 52" />
      </g>
      {/* les joues roses, seulement quand il est content */}
      <g className="iro-joues" fill={oreille} opacity="0">
        <ellipse cx="33" cy="50" rx="5" ry="3.2" />
        <ellipse cx="67" cy="50" rx="5" ry="3.2" />
      </g>
    </svg>
  )
}
