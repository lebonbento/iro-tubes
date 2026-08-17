import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Tube from './Tube.jsx'
import { coupLegal, quantiteVersee, sommet } from '../logique.js'
import { couleur } from '../couleurs.js'

const MONTEE = 150
const RETOUR = 150
const dureeVersement = (n) => Math.max(150, 65 * n)
const COL = 0.22 // le goulot, en fraction d'unité, au-dessus du liquide à ras bord

/**
 * Le plateau, et surtout le VERSEMENT.
 *
 * L'animation n'est pas de la décoration : sans elle on ne voit ni ce qui part
 * ni où ça arrive. Mais elle ne doit pas faire attendre. Deux règles :
 *
 *   — le coup est VALIDÉ dès que le liquide est arrivé, pas quand le tube a fini
 *     de revenir. Le joueur récupère la main ~200 ms plus tôt, et sur un niveau
 *     à 50 coups ça fait dix secondes d'attente en moins ;
 *   — le contenu affiché pendant le vol est figé au départ du coup, jamais
 *     recalculé depuis l'état : sinon la validation anticipée ferait sauter
 *     l'image en plein vol.
 */
export default function Plateau({ etat, hauteur, carte, motifs, jouer, gele, indiceCoup }) {
  const cadre = useRef(null)
  const tubes = useRef([])
  const [taille, setTaille] = useState({ largeur: 48, unite: 42, ecart: 10 })
  const [selection, setSelection] = useState(null)
  const [anim, setAnim] = useState(null)
  const [enVol, setEnVol] = useState(false)

  const lignes = etat.length <= 4 ? 1 : 2
  const colonnes = Math.ceil(etat.length / lignes)
  const rangees = []
  for (let i = 0; i < etat.length; i += colonnes) {
    rangees.push(Array.from({ length: Math.min(colonnes, etat.length - i) }, (_, k) => i + k))
  }

  // --- dimensionnement : le plateau doit tenir en entier, sans défilement ----
  useLayoutEffect(() => {
    const el = cadre.current
    if (!el) return
    const ajuster = () => {
      const L = el.clientWidth
      const H = el.clientHeight
      if (!L || !H) return
      const ecart = Math.max(6, Math.min(14, L / (colonnes * 6)))
      const largeurDispo = (L - (colonnes + 1) * ecart) / colonnes
      // Une place est réservée au-dessus de chaque rangée pour le bloc soulevé,
      // sinon il déborde sur la rangée du dessus ou hors du cadre.
      const hauteurDispo = (H - (lignes + 1) * ecart) / lignes
      const parHauteur = hauteurDispo / (hauteur + COL + 0.62) / 0.88
      const largeur = Math.max(18, Math.min(largeurDispo, parHauteur, 76))
      setTaille({ largeur, unite: largeur * 0.88, ecart })
    }
    ajuster()
    const ro = new ResizeObserver(ajuster)
    ro.observe(el)
    return () => ro.disconnect()
  }, [colonnes, lignes, hauteur])

  // --- déroulé de l'animation ----------------------------------------------
  useEffect(() => {
    if (!anim) return
    if (anim.phase === 'monte') {
      const t = setTimeout(() => setAnim((a) => a && { ...a, phase: 'verse' }), MONTEE)
      return () => clearTimeout(t)
    }
    if (anim.phase === 'verse') {
      const t = setTimeout(() => {
        // Le coup est acquis ici : la main est rendue pendant que le tube rentre.
        jouer(anim.de, anim.vers)
        setEnVol(false)
        setAnim((a) => a && { ...a, phase: 'retour', fini: true })
      }, dureeVersement(anim.n))
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setAnim(null), RETOUR)
    return () => clearTimeout(t)
  }, [anim, jouer])

  useEffect(() => {
    if (!anim || anim.phase !== 'monte') return
    let id2
    const id1 = requestAnimationFrame(() => { id2 = requestAnimationFrame(() => setEnVol(true)) })
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
  }, [anim])

  // Un changement de partie (niveau suivant, annulation, recommencer) coupe tout.
  useEffect(() => { setSelection(null) }, [etat])

  const demarrer = useCallback((de, vers) => {
    const n = quantiteVersee(etat, de, vers, hauteur)
    if (n === 0) return
    const rDe = tubes.current[de]?.getBoundingClientRect()
    const rVers = tubes.current[vers]?.getBoundingClientRect()
    if (!rDe || !rVers) { jouer(de, vers); return }
    setSelection(null)
    setEnVol(false)
    setAnim({
      de, vers, n, phase: 'monte', rDe, rVers,
      teinte: etat[de][etat[de].length - 1],
      // Figé maintenant : l'état changera avant la fin de l'animation.
      avant: etat[de],
      apres: etat[de].slice(0, etat[de].length - n),
      cible: etat[vers],
    })
  }, [etat, hauteur, jouer])

  const toucher = (i) => {
    if (gele) return
    if (anim && !anim.fini) return // pendant le vol, on ne joue pas à travers
    if (selection === null) {
      if (etat[i].length > 0) setSelection(i)
      return
    }
    if (selection === i) { setSelection(null); return }
    if (coupLegal(etat, selection, i, hauteur)) { demarrer(selection, i); return }
    setSelection(etat[i].length > 0 ? i : null)
  }

  // --- géométrie du tube en vol --------------------------------------------
  //
  // On vise le GOULOT, pas le tube : c'est le goulot qui doit surplomber la
  // cible. Le corps suit derrière, et comme il est long et l'écran étroit, il
  // faut ensuite le ramener de force dans l'écran — d'où le recadrage, puis le
  // recalcul du goulot RÉEL d'où part le jet.
  let vol = null
  if (anim) {
    const { rDe, rVers } = anim
    const w = rDe.width
    const h = rDe.height
    const cx = rDe.left + w / 2
    const cy = rDe.top + h / 2
    const destX = rVers.left + rVers.width / 2
    // Il faut DÉPASSER l'horizontale : sous 90°, le goulot reste plus haut que
    // le fond du tube et rien ne pourrait couler — le tube a l'air de pencher,
    // pas de verser. À 104° le goulot plonge vers la cible.
    const angle = (destX >= cx ? 1 : -1) * 104
    const rad = (angle * Math.PI) / 180
    const echelle = 0.78 // couché, le tube est large : il faut le reculer un peu
    const marge = taille.unite * 0.7

    const bras = {
      x: echelle * (h / 2) * Math.sin(rad),
      y: -echelle * (h / 2) * Math.cos(rad),
    }
    let centreX = destX - bras.x
    let centreY = rVers.top - marge - bras.y

    const demiL = (echelle * (w * Math.abs(Math.cos(rad)) + h * Math.abs(Math.sin(rad)))) / 2
    const demiH = (echelle * (w * Math.abs(Math.sin(rad)) + h * Math.abs(Math.cos(rad)))) / 2
    const borne = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max))
    centreX = borne(centreX, demiL + 4, window.innerWidth - demiL - 4)
    centreY = borne(centreY, demiH + 4, window.innerHeight - demiH - 4)

    const goulot = { x: centreX + bras.x, y: centreY + bras.y }
    const surface = rVers.top + taille.unite * COL + (hauteur - anim.cible.length) * taille.unite

    vol = {
      transform: `translate(${centreX - cx}px, ${centreY - cy}px) rotate(${angle}deg) scale(${echelle})`,
      contenu: anim.phase === 'monte' ? anim.avant : anim.apres,
      // Le liquide part du goulot en arc : un trait vertical se décrochait
      // visiblement du tube dès que celui-ci était recadré.
      jet: `M ${goulot.x} ${goulot.y} Q ${goulot.x + (destX - goulot.x) * 0.2} ${goulot.y + (surface - goulot.y) * 0.62} ${destX} ${surface}`,
    }
  }

  const bloc = selection !== null ? sommet(etat[selection]) : null

  return (
    <div ref={cadre} className="iro-cadre">
      {/* Une grille CSS collerait la dernière rangée incomplète à gauche.
          On découpe donc en rangées, chacune centrée sur elle-même. */}
      <div
        className="iro-grille"
        style={{ gap: taille.ecart + taille.unite * 0.62, paddingTop: taille.unite * 0.62 }}
      >
        {rangees.map((rangee, r) => (
          <div className="iro-rangee" key={r} style={{ gap: taille.ecart }}>
            {rangee.map((i) => {
              const enFuite = anim?.de === i
              const arrive = anim?.vers === i && !anim.fini
              return (
                <Tube
                  key={i}
                  refTube={(el) => { tubes.current[i] = el }}
                  contenu={enFuite ? [] : arrive ? anim.cible : etat[i]}
                  hauteur={hauteur}
                  largeur={taille.largeur}
                  unite={taille.unite}
                  carte={carte}
                  vide={etat[i].length === 0}
                  selectionne={selection === i}
                  leve={selection === i ? bloc.taille : 0}
                  motifs={motifs}
                  illumine={!anim && (indiceCoup?.[0] === i || indiceCoup?.[1] === i)}
                  ajout={arrive ? { n: anim.n, teinte: anim.teinte, ouvert: anim.phase !== 'monte', duree: dureeVersement(anim.n) } : null}
                  onClick={() => toucher(i)}
                />
              )
            })}
          </div>
        ))}
      </div>

      {anim && vol && (
        <div className="iro-survol" aria-hidden="true">
          <div
            className="iro-envol"
            style={{
              left: anim.rDe.left,
              top: anim.rDe.top,
              width: anim.rDe.width,
              height: anim.rDe.height,
              transform: enVol ? vol.transform : 'translate(0px, 0px) rotate(0deg)',
              transitionDuration: `${anim.phase === 'monte' ? MONTEE : RETOUR}ms`,
            }}
          >
            <Tube
              contenu={vol.contenu}
              hauteur={hauteur}
              largeur={taille.largeur}
              unite={taille.unite}
              carte={carte}
              vide={vol.contenu.length === 0}
              motifs={motifs}
            />
          </div>
          {anim.phase === 'verse' && (
            <svg className="iro-jet" width={window.innerWidth} height={window.innerHeight}>
              <path
                className="iro-trace"
                d={vol.jet}
                pathLength="1"
                fill="none"
                stroke={couleur(carte ? carte[anim.teinte] : anim.teinte).fond}
                strokeWidth={taille.unite * 0.26}
                strokeLinecap="round"
                style={{ animationDuration: `${Math.min(160, dureeVersement(anim.n))}ms` }}
              />
            </svg>
          )}
        </div>
      )}
    </div>
  )
}
