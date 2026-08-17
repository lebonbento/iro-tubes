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

/** Le tube DESSINÉ. Sa largeur est celle du verre, pas celle de la zone touchée. */
export function Corps({ contenu, hauteur, largeur, unite, carte, leve = 0, ajout = null, motifs }) {
  const teinte = (c) => (carte ? carte[c] : c)
  const hautLiquide = hauteur * unite
  const col = unite * 0.22
  const hautVerre = hautLiquide + col
  const saut = unite * 0.62
  const rayon = `${largeur * 0.13}px ${largeur * 0.13}px ${largeur * 0.44}px ${largeur * 0.44}px`
  const marge = Math.max(1.5, largeur * 0.06)
  const teinteAjout = ajout ? couleur(teinte(ajout.teinte)) : null

  return (
    <span className="iro-corps" style={{ width: largeur, height: hautVerre }}>
      <span className="iro-verre" style={{ borderRadius: rayon }} />
      <span className="iro-liquide" style={{ height: hautLiquide, top: col, left: marge, right: marge }}>
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
      <span className="iro-reflet" style={{ borderRadius: rayon }} />
    </span>
  )
}

/**
 * Un tube jouable.
 *
 * 🔑 Le VERRE et la ZONE TOUCHÉE sont deux choses différentes. Le verre est
 * dessiné petit ; le bouton, lui, occupe toute sa case. Réduire le dessin sans
 * réduire la cible, c'est ce qui permet d'aérer le plateau sans qu'on rate le
 * tube d'à côté avec le pouce — au niveau 60, un verre fait moins de 20 px de
 * large, on ne peut pas viser ça.
 *
 * `carte` traduit les couleurs du niveau (0, 1, 2…) en teintes de la palette.
 * `leve` est le bloc du sommet qui flotte au-dessus du goulot (la sélection),
 * `ajout` celui qu'on est en train d'y verser.
 */
export default function Tube({
  contenu, hauteur, largeur, cellule, unite, carte, selectionne, leve = 0, ajout = null,
  motifs, vide, onClick, refTube, illumine,
}) {
  const hautVerre = hauteur * unite + unite * 0.22
  return (
    <button
      type="button"
      ref={refTube}
      onClick={onClick}
      aria-label={vide ? 'Tube vide' : `Tube de ${contenu.length} unités`}
      className={`iro-tube ${selectionne ? 'est-choisi' : ''} ${illumine ? 'est-montre' : ''}`}
      style={{ width: cellule ?? largeur, height: hautVerre }}
    >
      <Corps
        contenu={contenu}
        hauteur={hauteur}
        largeur={largeur}
        unite={unite}
        carte={carte}
        leve={leve}
        ajout={ajout}
        motifs={motifs}
      />
    </button>
  )
}
