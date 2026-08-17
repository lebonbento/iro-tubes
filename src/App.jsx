import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Plateau from './composants/Plateau.jsx'
import donnees from './niveaux.json'
import { verser, gagne, coupsPossibles, tubeFini } from './logique.js'
import { lire, ecrire } from './stockage.js'
import { sonVersement, sonTubeFini, sonVictoire } from './sons.js'
import { repartition } from './couleurs.js'
import { compte, connecter, envoyer, viderLaFile, lireClassement, oublierCompte, enAttente } from './classement.js'

const NIVEAUX = donnees.niveaux
const DERNIER = NIVEAUX.length

const partieDepuisNiveau = (niveau) => ({
  source: 'campagne',
  numero: niveau.numero,
  hauteur: niveau.hauteur,
  couleurs: niveau.couleurs,
  par: niveau.par,
  parOptimal: niveau.parOptimal,
  depart: niveau.etat,
})

export default function App() {
  const [progression, setProgression] = useState(lire)
  const [partie, setPartie] = useState(() => {
    const p = lire()
    return partieDepuisNiveau(NIVEAUX[Math.min(p.dernier, DERNIER) - 1])
  })
  const [etat, setEtat] = useState(() => partie.depart)
  const [historique, setHistorique] = useState([])
  const [coupsJoues, setCoupsJoues] = useState([])
  const [ecran, setEcran] = useState(() => (lire().vu ? null : 'regles'))
  const [indiceCoup, setIndiceCoup] = useState(null)
  const [cherche, setCherche] = useState(false)
  const [fabrique, setFabrique] = useState(false)
  const [monCompte, setMonCompte] = useState(compte)
  const [envoi, setEnvoi] = useState(null)

  const ouvrier = useRef(null)
  const attentes = useRef(new Map())
  const compteur = useRef(0)

  useEffect(() => {
    const w = new Worker(new URL('./ouvrier.js', import.meta.url), { type: 'module' })
    w.onmessage = (e) => {
      const suite = attentes.current.get(e.data.id)
      attentes.current.delete(e.data.id)
      suite?.(e.data)
    }
    ouvrier.current = w
    return () => w.terminate()
  }, [])

  const demander = useCallback((type, charge) => new Promise((resoudre) => {
    const id = ++compteur.current
    attentes.current.set(id, resoudre)
    ouvrier.current?.postMessage({ id, type, charge })
  }), [])

  useEffect(() => { ecrire(progression) }, [progression])

  // Les résultats bloqués par une coupure réseau repartent au lancement.
  useEffect(() => { if (monCompte) viderLaFile().catch(() => {}) }, [monCompte])

  const majProgression = useCallback((suite) => setProgression((p) => suite({ ...p })), [])

  // --- démarrage d'une partie ----------------------------------------------
  const lancer = useCallback((nouvelle) => {
    setPartie(nouvelle)
    setEtat(nouvelle.depart)
    setHistorique([])
    setCoupsJoues([])
    setIndiceCoup(null)
    setEnvoi(null)
    setEcran(null)
  }, [])

  const allerAuNiveau = useCallback((n) => {
    if (n < 1 || n > DERNIER) return
    lancer(partieDepuisNiveau(NIVEAUX[n - 1]))
    majProgression((p) => ({ ...p, dernier: n }))
  }, [lancer, majProgression])

  const partieLibre = useCallback(async (couleurs) => {
    setFabrique(true)
    const reponse = await demander('libre', {
      couleurs, hauteur: couleurs >= 10 ? 5 : 4, vides: 2,
      graine: Math.floor(Math.random() * 1e9),
    })
    setFabrique(false)
    if (reponse.erreur) return
    lancer({
      source: 'libre', numero: null, hauteur: reponse.resultat.hauteur,
      couleurs, par: null, parOptimal: false, depart: reponse.resultat.etat,
    })
  }, [demander, lancer])

  // --- un coup --------------------------------------------------------------
  // Tout se calcule à partir de `etat` en clair : glisser des effets de bord
  // dans un setState(fonction) les fait jouer DEUX FOIS en développement
  // (StrictMode), et le compteur de coups se met à mentir.
  const jouer = useCallback((de, vers) => {
    const suivant = verser(etat, de, vers, partie.hauteur)
    if (suivant === etat) return
    setHistorique((h) => [...h, etat])
    setCoupsJoues((c) => [...c, [de, vers]])
    setEtat(suivant)
    setIndiceCoup(null)
    if (progression.sons) {
      if (!tubeFini(etat[vers], partie.hauteur) && tubeFini(suivant[vers], partie.hauteur)) sonTubeFini()
      else sonVersement(suivant[vers].length - etat[vers].length)
    }
  }, [etat, partie.hauteur, progression.sons])

  const annuler = useCallback(() => {
    if (historique.length === 0) return
    setEtat(historique[historique.length - 1])
    setHistorique((h) => h.slice(0, -1))
    setCoupsJoues((c) => c.slice(0, -1))
    setIndiceCoup(null)
  }, [historique])

  const recommencer = useCallback(() => {
    setEtat(partie.depart)
    setHistorique([])
    setCoupsJoues([])
    setIndiceCoup(null)
  }, [partie.depart])

  const demanderIndice = useCallback(async () => {
    if (cherche) return
    setCherche(true)
    const reponse = await demander('indice', { etat, hauteur: partie.hauteur })
    setCherche(false)
    setIndiceCoup(reponse.resultat ?? null)
  }, [cherche, demander, etat, partie.hauteur])

  // --- fin de partie --------------------------------------------------------
  const coups = coupsJoues.length
  const victoire = useMemo(() => gagne(etat, partie.hauteur), [etat, partie.hauteur])
  const bloque = useMemo(
    () => !victoire && coupsPossibles(etat, partie.hauteur).length === 0,
    [etat, partie.hauteur, victoire],
  )

  const victoireTraitee = useRef(false)
  useEffect(() => { victoireTraitee.current = false }, [partie])
  useEffect(() => {
    if (!victoire || victoireTraitee.current) return
    victoireTraitee.current = true
    if (progression.sons) sonVictoire()

    if (partie.source === 'campagne') {
      majProgression((p) => {
        const ancien = p.termines[partie.numero]
        return {
          ...p,
          termines: {
            ...p.termines,
            [partie.numero]: { coups: ancien ? Math.min(ancien.coups, coups) : coups },
          },
          dernier: Math.min(DERNIER, Math.max(p.dernier, partie.numero + 1)),
        }
      })
      if (monCompte) {
        setEnvoi({ etat: 'envoi' })
        envoyer(partie.numero, coupsJoues)
          .then((r) => setEnvoi(r.differe ? { etat: 'differe' } : { etat: 'ok', total: r.total }))
          .then(() => viderLaFile().catch(() => {}))
          .catch(() => setEnvoi({ etat: 'differe' }))
      }
    }
    const t = setTimeout(() => setEcran('victoire'), 620)
    return () => clearTimeout(t)
  }, [victoire, partie, coups, coupsJoues, majProgression, progression.sons, monCompte])

  const debloque = useMemo(() => {
    const faits = Object.keys(progression.termines).map(Number)
    return Math.min(DERNIER, (faits.length ? Math.max(...faits) : 0) + 1)
  }, [progression.termines])

  const carte = useMemo(() => repartition(partie.couleurs), [partie.couleurs])
  const titre = partie.source === 'campagne' ? `Niveau ${partie.numero}` : `Partie libre · ${partie.couleurs} couleurs`

  return (
    <div className="iro-app">
      <header className="iro-entete">
        <div className="iro-gauche">
          <button type="button" className="iro-lien" onClick={() => setEcran('niveaux')} aria-label="Niveaux">
            <span className="iro-marque">IRO</span>
          </button>
          <div className="iro-actions">
            <button type="button" className="iro-lien" onClick={() => setEcran('classement')} aria-label="Classement">★</button>
            <button type="button" className="iro-lien" onClick={() => setEcran('reglages')} aria-label="Réglages">⚙</button>
          </div>
        </div>
        {/* Le compteur est présenté comme un RELEVÉ : « 18 / 37 », chiffres
            tabulaires, unité en petites capitales. C'est ce qui donne sa valeur
            au minimum calculé par le solveur — sinon ce n'est qu'une note. */}
        {/* La légende tient sur UNE ligne : « niv. 60 · minimum » repliait
            l'en-tête sur deux lignes et poussait les icônes au milieu. */}
        <div className="iro-titre">
          <strong>{partie.par ? `${coups} / ${partie.par}` : coups}</strong>
          <span>
            {partie.source === 'campagne'
              ? `niv. ${partie.numero} · ${partie.parOptimal ? 'minimum' : 'connu'}`
              : `partie libre · ${partie.couleurs} couleurs`}
          </span>
        </div>
      </header>

      <main className="iro-scene">
        {/* La signature de l'estampe, posée une seule fois. */}
        <span className="iro-sceau" aria-hidden="true">色</span>
        <Plateau
          etat={etat}
          hauteur={partie.hauteur}
          carte={carte}
          motifs={progression.motifs}
          jouer={jouer}
          gele={victoire || ecran !== null}
          indiceCoup={indiceCoup}
        />
      </main>

      {bloque && (
        <div className="iro-alerte">Plus aucun coup possible. Annulez, ou recommencez le niveau.</div>
      )}

      <footer className="iro-barre">
        <button type="button" onClick={annuler} disabled={historique.length === 0 || victoire}>
          <span>↶</span>Annuler
        </button>
        <button type="button" onClick={recommencer} disabled={coups === 0}>
          <span>↺</span>Recommencer
        </button>
        <button type="button" onClick={demanderIndice} disabled={victoire || cherche}>
          <span>{cherche ? '…' : '💡'}</span>{cherche ? 'Je cherche' : 'Indice'}
        </button>
      </footer>

      {ecran === 'victoire' && (
        <Voile>
          <h2>Tubes rangés</h2>
          <p className="iro-score">
            {coups} coup{coups > 1 ? 's' : ''}
            {partie.par && (
              <em>
                {coups === partie.par && partie.parOptimal
                  ? ' — c’est le minimum absolu, impeccable'
                  : ` · ${partie.parOptimal ? 'le minimum est' : 'la meilleure connue est'} ${partie.par}`}
              </em>
            )}
          </p>
          {partie.source === 'campagne' && (
            <p className="iro-note">
              {!monCompte && 'Créez un pseudo pour figurer au classement mondial.'}
              {monCompte && envoi?.etat === 'envoi' && 'Envoi au classement…'}
              {monCompte && envoi?.etat === 'ok' && `Classement mis à jour : ${envoi.total.niveaux} niveaux, ${envoi.total.coups} coups.`}
              {monCompte && envoi?.etat === 'differe' && 'Pas de réseau : le résultat partira tout seul plus tard.'}
            </p>
          )}
          <div className="iro-choix">
            {partie.source === 'campagne' && partie.numero < DERNIER && (
              <button type="button" className="iro-primaire" onClick={() => allerAuNiveau(partie.numero + 1)}>
                Niveau {partie.numero + 1}
              </button>
            )}
            {partie.source === 'libre' && (
              <button type="button" className="iro-primaire" onClick={() => partieLibre(partie.couleurs)}>Une autre</button>
            )}
            <button type="button" onClick={recommencer}>Refaire celui-ci</button>
            {!monCompte
              ? <button type="button" onClick={() => setEcran('compte')}>Rejoindre le classement</button>
              : <button type="button" onClick={() => setEcran('classement')}>Classement</button>}
          </div>
        </Voile>
      )}

      {ecran === 'regles' && (
        <Voile>
          <h2>Comment on joue</h2>
          <ul className="iro-regles">
            <li>Touchez un tube pour <b>soulever</b> la couleur du dessus, puis un autre pour <b>y verser</b>.</li>
            <li>On ne verse que sur <b>la même couleur</b>, ou dans un <b>tube vide</b>.</li>
            <li>Tout le bloc part d’un coup, dans la limite de la place.</li>
            <li>Gagné quand chaque tube ne contient <b>qu’une seule couleur</b>.</li>
          </ul>
          <p className="iro-note">Tous les niveaux sont vérifiés par un solveur : aucun n’est impossible.</p>
          <div className="iro-choix">
            <button type="button" className="iro-primaire" onClick={() => { majProgression((p) => ({ ...p, vu: true })); setEcran(null) }}>
              Commencer
            </button>
          </div>
        </Voile>
      )}

      {ecran === 'niveaux' && (
        <Voile large>
          <h2>Les niveaux</h2>
          {/* Une grille de 500 boutons est illisible : on découpe en chapitres
              de vingt, et on ouvre d'emblée celui où le joueur en est. */}
          <ChoixNiveaux
            niveaux={NIVEAUX}
            termines={progression.termines}
            debloque={debloque}
            courant={partie.numero}
            aller={allerAuNiveau}
          />
          <h3>Partie libre</h3>
          <p className="iro-note">Un plateau tiré au hasard, vérifié soluble avant d’être servi. Hors classement.</p>
          <div className="iro-choix">
            {[6, 9, 12].map((c) => (
              <button key={c} type="button" disabled={fabrique} onClick={() => partieLibre(c)}>
                {fabrique ? '…' : `${c} couleurs`}
              </button>
            ))}
          </div>
          <div className="iro-choix">
            <button type="button" className="iro-primaire" onClick={() => setEcran(null)}>Retour au jeu</button>
          </div>
        </Voile>
      )}

      {ecran === 'classement' && (
        <PanneauClassement
          monCompte={monCompte}
          fermer={() => setEcran(null)}
          versCompte={() => setEcran('compte')}
        />
      )}

      {ecran === 'compte' && (
        <PanneauCompte
          monCompte={monCompte}
          fermer={() => setEcran(null)}
          surConnexion={(c) => { setMonCompte(c); setEcran('classement') }}
          surOubli={() => { oublierCompte(); setMonCompte(null) }}
        />
      )}

      {ecran === 'reglages' && (
        <Voile>
          <h2>Réglages</h2>
          <label className="iro-bascule">
            <input
              type="checkbox"
              checked={progression.motifs}
              onChange={(e) => majProgression((p) => ({ ...p, motifs: e.target.checked }))}
            />
            <span>
              <b>Motifs sur les couleurs</b>
              <em>Une forme distincte par couleur — indispensable si vous distinguez mal certaines teintes.</em>
            </span>
          </label>
          <label className="iro-bascule">
            <input
              type="checkbox"
              checked={progression.sons}
              onChange={(e) => majProgression((p) => ({ ...p, sons: e.target.checked }))}
            />
            <span><b>Sons</b><em>Le versement, le tube terminé, la victoire.</em></span>
          </label>
          <div className="iro-choix">
            <button type="button" onClick={() => setEcran('compte')}>
              {monCompte ? `Compte : ${monCompte.pseudo}` : 'Rejoindre le classement'}
            </button>
            <button type="button" onClick={() => setEcran('regles')}>Revoir les règles</button>
            <button type="button" className="iro-primaire" onClick={() => setEcran(null)}>Fermer</button>
          </div>
        </Voile>
      )}
    </div>
  )
}

const TAILLE_CHAPITRE = 20

function ChoixNiveaux({ niveaux, termines, debloque, courant, aller }) {
  const chapitres = Math.ceil(niveaux.length / TAILLE_CHAPITRE)
  const [chapitre, setChapitre] = useState(
    () => Math.floor(((courant ?? debloque) - 1) / TAILLE_CHAPITRE),
  )
  const debut = chapitre * TAILLE_CHAPITRE
  const tranche = niveaux.slice(debut, debut + TAILLE_CHAPITRE)

  return (
    <>
      <div className="iro-chapitres">
        {Array.from({ length: chapitres }, (_, c) => {
          const premier = c * TAILLE_CHAPITRE + 1
          const dernier = Math.min(niveaux.length, premier + TAILLE_CHAPITRE - 1)
          const faits = niveaux
            .slice(c * TAILLE_CHAPITRE, c * TAILLE_CHAPITRE + TAILLE_CHAPITRE)
            .filter((n) => termines[n.numero]).length
          return (
            <button
              key={c}
              type="button"
              disabled={premier > debloque}
              className={`iro-chapitre ${c === chapitre ? 'est-ouvert' : ''} ${faits === dernier - premier + 1 ? 'est-fait' : ''}`}
              onClick={() => setChapitre(c)}
            >
              {premier}–{dernier}
            </button>
          )
        })}
      </div>
      <div className="iro-grille-niveaux">
        {tranche.map((n) => {
          const fait = termines[n.numero]
          const ouvert = n.numero <= debloque
          return (
            <button
              key={n.numero}
              type="button"
              disabled={!ouvert}
              className={`iro-pastille ${fait ? 'est-fait' : ''} ${n.numero === courant ? 'est-courant' : ''}`}
              onClick={() => aller(n.numero)}
            >
              <b>{n.numero}</b>
              <i>{fait ? `${fait.coups}` : ouvert ? '' : '·'}</i>
            </button>
          )
        })}
      </div>
      <p className="iro-note">
        {Object.keys(termines).length} niveau{Object.keys(termines).length > 1 ? 'x' : ''} terminé
        {Object.keys(termines).length > 1 ? 's' : ''} sur {niveaux.length}.
      </p>
    </>
  )
}

function PanneauClassement({ monCompte, fermer, versCompte }) {
  const [donneesClassement, setDonnees] = useState(null)
  const [erreur, setErreur] = useState(null)

  useEffect(() => {
    let vivant = true
    lireClassement()
      .then((d) => vivant && setDonnees(d))
      .catch((e) => vivant && setErreur(e.message))
    return () => { vivant = false }
  }, [])

  const attente = enAttente().length

  return (
    <Voile large>
      <h2>Classement mondial</h2>
      <p className="iro-note">
        Classé au nombre de niveaux finis, puis au total de coups — le moins possible.
        Chaque résultat est <b>rejoué par le serveur</b> : impossible d’y figurer sans avoir résolu les niveaux.
      </p>
      {attente > 0 && <p className="iro-note">⏳ {attente} résultat{attente > 1 ? 's' : ''} en attente d’envoi.</p>}

      {erreur && <p className="iro-alerte">{erreur}</p>}
      {!donneesClassement && !erreur && <p className="iro-note">Chargement…</p>}

      {donneesClassement && (
        donneesClassement.classement.length === 0
          ? <p className="iro-note">Personne n’est encore classé. À vous l’honneur.</p>
          : (
            <table className="iro-table">
              <thead>
                <tr><th></th><th>Joueur</th><th>Niveaux</th><th>Coups</th><th>Parfaits</th></tr>
              </thead>
              <tbody>
                {donneesClassement.classement.map((l) => (
                  <tr key={l.pseudo} className={monCompte?.pseudo === l.pseudo ? 'est-moi' : ''}>
                    <td>{l.rang}</td>
                    <td>{l.pseudo}</td>
                    <td>{l.niveaux}</td>
                    <td>{l.coups}</td>
                    <td>{l.parfaits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
      )}

      <div className="iro-choix">
        {!monCompte && <button type="button" className="iro-primaire" onClick={versCompte}>Rejoindre</button>}
        {monCompte && <button type="button" onClick={versCompte}>Mon compte</button>}
        <button type="button" className={monCompte ? 'iro-primaire' : ''} onClick={fermer}>Fermer</button>
      </div>
    </Voile>
  )
}

function PanneauCompte({ monCompte, fermer, surConnexion, surOubli }) {
  const [pseudo, setPseudo] = useState(monCompte?.pseudo ?? '')
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState(null)
  const [occupe, setOccupe] = useState(false)

  const valider = async (e) => {
    e.preventDefault()
    setErreur(null)
    setOccupe(true)
    try {
      const r = await connecter(pseudo, code)
      surConnexion({ pseudo: r.pseudo, code })
    } catch (err) {
      setErreur(err.message)
    } finally {
      setOccupe(false)
    }
  }

  return (
    <Voile>
      <h2>{monCompte ? 'Mon compte' : 'Rejoindre le classement'}</h2>
      <p className="iro-note">
        Un pseudo et un code à 4 chiffres, rien d’autre. Le code sert à retrouver votre place
        depuis un autre appareil ; il n’est jamais affiché ni envoyé en clair.
      </p>
      <form onSubmit={valider} className="iro-formulaire">
        <label>
          <span>Pseudo</span>
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            maxLength={14}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="MIKI"
          />
        </label>
        <label>
          <span>Code à 4 chiffres</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            autoComplete="off"
            placeholder="••••"
          />
        </label>
        {erreur && <p className="iro-erreur">{erreur}</p>}
        <div className="iro-choix">
          <button type="submit" className="iro-primaire" disabled={occupe || code.length !== 4 || pseudo.trim().length < 2}>
            {occupe ? '…' : monCompte ? 'Vérifier' : 'Créer / rejoindre'}
          </button>
          <button type="button" onClick={fermer}>Fermer</button>
        </div>
      </form>
      {monCompte && (
        <div className="iro-choix">
          <button type="button" onClick={() => { surOubli(); fermer() }}>Oublier ce compte sur cet appareil</button>
        </div>
      )}
    </Voile>
  )
}

function Voile({ children, large }) {
  return (
    <div className="iro-voile">
      <div className={`iro-panneau ${large ? 'est-large' : ''}`}>{children}</div>
    </div>
  )
}
