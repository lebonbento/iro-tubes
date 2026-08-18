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
function Bloc({ index, teinte, n, unite, largeur, motifs, decalage }) {
  const c = couleur(teinte)
  const encre = clair(c.fond) ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.66)'
  return (
    <div
      className="iro-unite"
      style={{
        height: n * unite,
        // APLAT. Un dégradé par bande donnait de la gélatine empilée : dans les
        // jeux du genre la couleur est plate, et tout le relief vient d'un seul
        // ombrage cylindrique posé par-dessus la bouteille entière.
        background: c.fond,
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
// La hauteur du bouchon, en fraction d'unité : il est posé AU-DESSUS du corps.
export const COL_FIOLE = 0.5

/**
 * La bouteille.
 *
 * 🔑 Copiée de la référence, et ma première version se trompait de forme : ce
 * n'est PAS une fiole à goulot étroit, c'est un simple RECTANGLE ARRONDI avec
 * un bouchon posé dessus, comme une gourde. Le grand aplat sombre en haut de
 * mes premières bouteilles n'était pas un bouchon, c'était du verre vide — d'où
 * l'allure de feutre.
 *
 * Deux autres écarts corrigés : le bouchon est une pièce SÉPARÉE et étroite
 * (46 % de la largeur), et les bandes sont bien plus larges que hautes
 * (une unité vaut 0,62 largeur, contre 0,8 avant).
 */
export function Corps({ contenu, hauteur, largeur, unite, carte, leve = 0, ajout = null, motifs, range }) {
  const teinte = (c) => (carte ? carte[c] : c)
  const hautCorps = hauteur * unite
  const hautBouchon = unite * COL_FIOLE
  const rHaut = largeur * 0.22
  const rBas = largeur * 0.17
  const rayon = `${rHaut}px ${rHaut}px ${rBas}px ${rBas}px`
  const saut = unite * 0.55
  const teinteAjout = ajout ? couleur(teinte(ajout.teinte)) : null
  const cadre = { top: hautBouchon, height: hautCorps, borderRadius: rayon }

  return (
    <span className="iro-corps" style={{ width: largeur, height: hautCorps + hautBouchon }}>
      {/* le bouchon et sa bague : deux pièces distinctes posées sur le corps */}
      <span
        className={`iro-bouchon ${range ? 'est-scelle' : ''}`}
        style={{
          width: largeur * 0.46,
          height: hautBouchon * 0.8,
          borderRadius: `${largeur * 0.1}px ${largeur * 0.1}px ${largeur * 0.04}px ${largeur * 0.04}px`,
        }}
      />
      <span
        className="iro-bague"
        style={{ width: largeur * 0.58, height: hautBouchon * 0.34, top: hautBouchon * 0.68 }}
      />

      <span className="iro-verre" style={cadre} />
      <span className="iro-liquide" style={cadre}>
        {enBlocs(contenu).map((b, i, tous) => (
          <Bloc
            key={i}
            index={i}
            teinte={teinte(b.teinte)}
            n={b.n}
            unite={unite}
            largeur={largeur}
            motifs={motifs}
            decalage={i === tous.length - 1 && leve > 0 ? saut : 0}
          />
        ))}
        {ajout && (
          <div
            className="iro-ajout"
            style={{
              height: ajout.ouvert ? ajout.n * unite : 0,
              transitionDuration: `${ajout.duree ?? 240}ms`,
              background: teinteAjout.fond,
            }}
          />
        )}
      </span>
      {/* ombrage cylindrique, reflet vertical, puis le contour par-dessus */}
      <span className="iro-ombrage" style={cadre} />
      <span className="iro-reflet" style={cadre} />
      <span className="iro-contour" style={cadre} />
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
