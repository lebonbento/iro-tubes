import { couleur, motif } from '../couleurs.js'

/** Luminance relative, pour poser un motif lisible sur chaque couleur. */
function clair(hex) {
  const v = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * v(1) + 0.7152 * v(3) + 0.0722 * v(5) > 0.42
}

function Unite({ index, teinte, taille, largeur, arrondiBas, arrondiHaut, motifs, decalage }) {
  const c = couleur(teinte)
  const encre = clair(c.fond) ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.66)'
  return (
    <div
      className="iro-unite"
      style={{
        height: taille,
        background: `linear-gradient(180deg, ${c.clair} 0%, ${c.fond} 34%, ${c.sombre} 100%)`,
        borderBottomLeftRadius: arrondiBas ? largeur * 0.4 : 0,
        borderBottomRightRadius: arrondiBas ? largeur * 0.4 : 0,
        borderTopLeftRadius: arrondiHaut ? largeur * 0.12 : 0,
        borderTopRightRadius: arrondiHaut ? largeur * 0.12 : 0,
        transform: decalage ? `translateY(${-decalage}px)` : undefined,
        zIndex: index,
      }}
    >
      {motifs && (
        <svg viewBox="0 0 100 100" className="iro-motif" aria-hidden="true">
          <path d={motif(teinte)} fill={encre} />
        </svg>
      )}
    </div>
  )
}

/**
 * Un tube.
 *
 * `carte` traduit les couleurs du niveau (0, 1, 2…) en teintes de la palette,
 * pour que trois couleurs soient trois teintes ÉLOIGNÉES et non trois voisines.
 * `leve` est le nombre d'unités du sommet qui flottent au-dessus du goulot (le
 * bloc sélectionné), `ajout` celles qu'on est en train d'y verser : elles
 * poussent depuis une hauteur nulle, ce qui donne le remplissage.
 */
export default function Tube({
  contenu, hauteur, largeur, unite, carte, selectionne, leve = 0, ajout = null,
  motifs, vide, onClick, refTube, illumine,
}) {
  const teinte = (c) => (carte ? carte[c] : c)
  const hautLiquide = hauteur * unite
  const col = unite * 0.22 // le col du tube, au-dessus du liquide à ras bord
  const hautVerre = hautLiquide + col
  const saut = unite * 0.62
  const rayon = `${largeur * 0.13}px ${largeur * 0.13}px ${largeur * 0.44}px ${largeur * 0.44}px`

  const teinteAjout = ajout ? couleur(teinte(ajout.teinte)) : null

  return (
    <button
      type="button"
      ref={refTube}
      onClick={onClick}
      aria-label={vide ? 'Tube vide' : `Tube de ${contenu.length} unités`}
      className={`iro-tube ${selectionne ? 'est-choisi' : ''} ${illumine ? 'est-montre' : ''}`}
      style={{ width: largeur, height: hautVerre }}
    >
      <span className="iro-verre" style={{ height: hautVerre, borderRadius: rayon }} />
      <span className="iro-liquide" style={{ height: hautLiquide, top: col }}>
        {contenu.map((c, i) => (
          <Unite
            key={i}
            index={i}
            teinte={teinte(c)}
            taille={unite}
            largeur={largeur}
            arrondiBas={i === 0}
            arrondiHaut={i === contenu.length - 1 && !ajout}
            motifs={motifs}
            decalage={i >= contenu.length - leve ? saut : 0}
          />
        ))}
        {ajout && (
          <div
            className="iro-ajout"
            style={{
              height: ajout.ouvert ? ajout.n * unite : 0,
              transitionDuration: `${ajout.duree ?? 240}ms`,
              background: `linear-gradient(180deg, ${teinteAjout.clair} 0%, ${teinteAjout.fond} 40%, ${teinteAjout.sombre} 100%)`,
              borderBottomLeftRadius: contenu.length === 0 ? largeur * 0.4 : 0,
              borderBottomRightRadius: contenu.length === 0 ? largeur * 0.4 : 0,
              borderTopLeftRadius: largeur * 0.12,
              borderTopRightRadius: largeur * 0.12,
            }}
          />
        )}
      </span>
      <span className="iro-reflet" style={{ height: hautVerre, borderRadius: rayon }} />
    </button>
  )
}
