import { couleur, motif } from '../couleurs.js'

/** Luminance relative, pour poser un motif lisible sur chaque couleur. */
function clair(hex) {
  const v = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * v(1) + 0.7152 * v(3) + 0.0722 * v(5) > 0.42
}

/**
 * Un BLOC : toutes les unités contiguës de même couleur, dessinées d'un seul
 * tenant.
 *
 * 🔑 Dessiner unité par unité faisait apparaître quatre bandes dans un flacon
 * pourtant d'une seule couleur — chacune avait son reflet et son ombre. Les
 * jeux du genre montrent une colonne continue ; c'est ce qui distingue un
 * liquide d'une pile de cubes.
 */
function Bloc({ index, teinte, n, unite, largeur, arrondiBas, surface, motifs, decalage }) {
  const c = couleur(teinte)
  const encre = clair(c.fond) ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.66)'
  return (
    <div
      className={`iro-unite ${surface ? 'est-surface' : ''}`}
      style={{
        height: n * unite,
        // APLAT. Un dégradé par bande donnait de la gélatine empilée : dans les
        // jeux du genre la couleur est plate, et tout le relief vient d'un seul
        // ombrage cylindrique posé par-dessus la bouteille entière.
        background: c.fond,
        borderBottomLeftRadius: arrondiBas ? largeur * 0.42 : 0,
        borderBottomRightRadius: arrondiBas ? largeur * 0.42 : 0,
        transform: decalage ? `translateY(${-decalage}px)` : undefined,
        zIndex: index,
      }}
    >
      {motifs && Array.from({ length: n }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 100 100"
          className="iro-motif"
          style={{ top: `${((i + 0.5) / n) * 100}%`, width: unite * 0.5, height: unite * 0.5 }}
          aria-hidden="true"
        >
          <path d={motif(teinte)} fill={encre} />
        </svg>
      ))}
    </div>
  )
}

/** Découpe le contenu en blocs contigus de même couleur, du fond vers le haut. */
function enBlocs(contenu) {
  const blocs = []
  for (const c of contenu) {
    const dernier = blocs[blocs.length - 1]
    if (dernier && dernier.teinte === c) dernier.n++
    else blocs.push({ teinte: c, n: 1 })
  }
  return blocs
}

// Le col d'un flacon, en fraction d'unité : le goulot étroit plus l'épaule qui
// s'évase. Le liquide ne monte QUE jusqu'à l'épaule — au-dessus c'est du verre.
export const COL_FIOLE = 0.6

/**
 * Le contour d'un flacon : goulot étroit, épaules évasées, fond arrondi.
 *
 * Un seul tracé sert à trois choses — le verre (rempli), le liseré (contour) et
 * le DÉTOURAGE du liquide. Les trois se superposent donc exactement, et le
 * liseré, dessiné par-dessus, couvre le bord du liquide : c'est ce qui donne
 * l'impression que le liquide est vraiment dedans.
 */
export function contourFiole(largeur, unite, hauteur) {
  const W = largeur
  const goulot = unite * 0.2
  const epaule = unite * 0.26
  const corps = hauteur * unite
  const lg = W * 0.62          // largeur du goulot
  const x1 = (W - lg) / 2
  const x2 = (W + lg) / 2
  const r = lg * 0.28          // arrondi de la lèvre
  const yG = goulot
  const yE = goulot + epaule
  const yB = yE + corps
  const rb = W * 0.3           // fond arrondi, plus carré
  return [
    `M ${x1 + r} 0`,
    `L ${x2 - r} 0`,
    `Q ${x2} 0 ${x2} ${r}`,
    `L ${x2} ${yG}`,
    // L'épaule bombe VITE puis s'aplatit : une simple diagonale donnait un
    // cône de feutre, pas une bouteille.
    `C ${x2} ${yG + (yE - yG) * 0.7} ${W} ${yG + (yE - yG) * 0.25} ${W} ${yE}`,
    `L ${W} ${yB - rb}`,
    `Q ${W} ${yB} ${W - rb} ${yB}`,
    `L ${rb} ${yB}`,
    `Q 0 ${yB} 0 ${yB - rb}`,
    `L 0 ${yE}`,
    `C 0 ${yG + (yE - yG) * 0.25} ${x1} ${yG + (yE - yG) * 0.7} ${x1} ${yG}`,
    `L ${x1} ${r}`,
    `Q ${x1} 0 ${x1 + r} 0`,
    'Z',
  ].join(' ')
}

/** Le flacon DESSINÉ. Sa largeur est celle du verre, pas celle de la zone touchée. */
export function Corps({ contenu, hauteur, largeur, unite, carte, leve = 0, ajout = null, motifs, range }) {
  const teinte = (c) => (carte ? carte[c] : c)
  const hautLiquide = hauteur * unite
  const hautVerre = hautLiquide + unite * COL_FIOLE
  const saut = unite * 0.62
  const trace = contourFiole(largeur, unite, hauteur)
  const detourage = `path('${trace}')`
  const teinteAjout = ajout ? couleur(teinte(ajout.teinte)) : null

  return (
    <span className="iro-corps" style={{ width: largeur, height: hautVerre }}>
      <svg className="iro-fiole" viewBox={`0 0 ${largeur} ${hautVerre}`} aria-hidden="true">
        <path d={trace} className="iro-verre-fond" />
      </svg>
      <span className="iro-liquide" style={{ clipPath: detourage, WebkitClipPath: detourage }}>
        {enBlocs(contenu).map((b, i, tous) => (
          <Bloc
            key={i}
            index={i}
            teinte={teinte(b.teinte)}
            n={b.n}
            unite={unite}
            largeur={largeur}
            arrondiBas={i === 0}
            surface={i === tous.length - 1 && !ajout}
            motifs={motifs}
            decalage={i === tous.length - 1 && leve > 0 ? saut : 0}
          />
        ))}
        {ajout && (
          <div
            className="iro-ajout est-surface"
            style={{
              height: ajout.ouvert ? ajout.n * unite : 0,
              transitionDuration: `${ajout.duree ?? 240}ms`,
              background: `linear-gradient(168deg, ${teinteAjout.clair} 0%, ${teinteAjout.fond} 44%, ${teinteAjout.sombre} 100%)`,
              borderBottomLeftRadius: contenu.length === 0 ? largeur * 0.42 : 0,
              borderBottomRightRadius: contenu.length === 0 ? largeur * 0.42 : 0,
            }}
          />
        )}
      </span>
      {/* L'ombrage cylindrique : bords sombres, cœur clair. C'est lui qui rend
          la bouteille ronde, et il court sur toute la hauteur d'un seul tenant. */}
      <span className="iro-ombrage" style={{ clipPath: detourage, WebkitClipPath: detourage }} />
      <span className="iro-reflet" style={{ clipPath: detourage, WebkitClipPath: detourage }} />
      <svg className="iro-fiole iro-contour" viewBox={`0 0 ${largeur} ${hautVerre}`} aria-hidden="true">
        <path d={trace} />
      </svg>
      {/* Le bouchon ne se pose que lorsque la couleur est finie : c'est la
          récompense qu'on voit, et elle scelle le flacon pour de bon. */}
      {range && (
        <span
          className="iro-bouchon"
          style={{
            width: largeur * 0.76,
            height: unite * 0.46,
            borderRadius: `${largeur * 0.12}px`,
            top: -unite * 0.2,
          }}
        />
      )}
    </span>
  )
}

/**
 * Un tube jouable.
 *
 * 🔑 Le VERRE et la ZONE TOUCHÉE sont deux choses différentes. Le verre est
 * dessiné petit ; le bouton, lui, occupe toute sa case. Réduire le dessin sans
 * réduire la cible, c'est ce qui permet d'aérer le plateau sans qu'on rate le
 * tube d'à côté avec le pouce.
 *
 * `range` marque un tube terminé : il s'ourle d'or. Finir une couleur doit se
 * voir, sinon ranger n'est qu'une case cochée.
 */
export default function Tube({
  contenu, hauteur, largeur, cellule, unite, carte, selectionne, leve = 0, ajout = null,
  motifs, vide, range, onClick, refTube, illumine,
}) {
  const hautVerre = hauteur * unite + unite * COL_FIOLE
  return (
    <button
      type="button"
      ref={refTube}
      onClick={onClick}
      aria-label={vide ? 'Tube vide' : `Tube de ${contenu.length} unités`}
      className={`iro-tube ${selectionne ? 'est-choisi' : ''} ${illumine ? 'est-montre' : ''} ${range ? 'est-range' : ''}`}
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
        range={range}
      />
    </button>
  )
}
