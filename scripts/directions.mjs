// Trois directions artistiques pour IRO, dessinées sur le VRAI écran de jeu.
//
// Une DA ne se juge pas sur une planche d'ambiance : elle se juge sur l'écran
// qu'on aura sous les yeux pendant vingt minutes. Chaque page ci-dessous rend
// donc le même plateau — même niveau, mêmes couleurs, même barre de boutons —
// avec un seul paramètre changé : la direction.
//
// Contrainte tenue par les trois : AUCUNE police à télécharger. Le jeu est une
// PWA hors-ligne ; une DA qui exige un fichier de 200 Ko n'en est pas une.
// `ui-serif` donne New York sur iPhone et Mac, Georgia ailleurs.
//
//   npm run directions

import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PALETTE, repartition } from '../src/couleurs.js'

const ici = dirname(fileURLToPath(import.meta.url))
const sortie = join(ici, '..', 'design', 'directions')
mkdirSync(sortie, { recursive: true })

// --- teintes ---------------------------------------------------------------
const versHsl = (hex) => {
  const [r, v, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, v, b); const min = Math.min(r, v, b)
  const l = (max + min) / 2; const d = max - min
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r) h = ((v - b) / d) % 6
  else if (max === v) h = (b - r) / d + 2
  else h = (r - v) / d + 4
  return [(h * 60 + 360) % 360, s, l]
}
const hsl = (h, s, l, a = 1) => `hsl(${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%${a < 1 ? ` / ${a}` : ''})`

/** Décline une couleur de la palette selon la direction. */
const teinter = (index, reglage) => {
  const [h, s, l] = versHsl(PALETTE[index].fond)
  const S = Math.max(0, Math.min(1, s * reglage.sat))
  const L = Math.max(0.05, Math.min(0.95, l + reglage.lum))
  return {
    haut: hsl(h, S * reglage.satHaut, Math.min(0.95, L + reglage.ecart)),
    milieu: hsl(h, S, L),
    bas: hsl(h, S, Math.max(0.06, L - reglage.ecart)),
    pur: hsl(h, S, L),
  }
}

// --- le plateau, identique dans les trois directions -----------------------
const COULEURS = repartition(6)
const PLATEAU = [
  [COULEURS[0], COULEURS[3], COULEURS[1], COULEURS[5]],
  [COULEURS[2], COULEURS[0], COULEURS[4], COULEURS[3]],
  [COULEURS[5], COULEURS[4], COULEURS[2], COULEURS[1]],
  [COULEURS[1], COULEURS[5], COULEURS[3], COULEURS[0]],
  [COULEURS[4], COULEURS[2], COULEURS[0], COULEURS[2]],
  [COULEURS[3], COULEURS[1], COULEURS[5], COULEURS[4]],
  [],
  [],
]
const SELECTION = 2 // le tube dont le bloc du sommet est soulevé

const LARGEUR = 40
const UNITE = LARGEUR * 0.88
const HAUTEUR = 4

/**
 * Le gabarit commun. Chaque direction ne fournit que sa peau : le fond, le
 * dessin d'un tube, celui d'une unité, et la garniture (en-tête, barre).
 */
function ecran(d) {
  const tube = (contenu, i) => {
    const leve = i === SELECTION ? 1 : 0
    const unites = contenu.map((t, k) => d.unite(teinter(t, d.teinte), {
      premier: k === 0,
      dernier: k === contenu.length - 1,
      leve: k >= contenu.length - leve,
    })).join('')
    return d.tube(unites, { vide: contenu.length === 0, choisi: i === SELECTION })
  }
  const rangees = [PLATEAU.slice(0, 4), PLATEAU.slice(4)]
    .map((r, ri) => `<div class="rangee">${r.map((c, k) => tube(c, ri * 4 + k)).join('')}</div>`)
    .join('')

  return `<!-- @dsCard group="Directions artistiques" -->
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${d.nom}</title>
<!-- SANS cette ligne, un téléphone rend la page sur 980 px de large : la règle
     @media ne s'applique pas et on regarde une maquette miniature au lieu de
     l'écran de jeu. C'est précisément ce qu'on veut juger ici. -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${d.themeColor}">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #17181c;
    color: #e9e9ec;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    padding: 30px;
    display: flex;
    gap: 34px;
    align-items: flex-start;
  }
  .fiche { max-width: 27em; padding-top: 6px; }
  .fiche h1 { font-family: ui-serif, Georgia, serif; font-size: 1.6rem; font-weight: 500; letter-spacing: .01em; }
  .fiche .quoi { font-size: .8rem; color: #9a9aa4; margin: 3px 0 18px; letter-spacing: .13em; text-transform: uppercase; }
  .fiche p { font-size: .87rem; line-height: 1.62; color: #c6c6cf; margin-bottom: 12px; }
  .fiche b { color: #fff; font-weight: 600; }
  .fiche ul { list-style: none; margin-top: 16px; border-top: 1px solid #2c2d34; }
  .fiche li { font-size: .8rem; color: #9a9aa4; padding: 8px 0; border-bottom: 1px solid #2c2d34; display: flex; gap: 12px; }
  .fiche li i { font-style: normal; color: #6f7078; width: 6.5em; flex: none; }
  .fiche li span { color: #d7d7de; }

  .tel {
    width: 390px; height: 730px; flex: none;
    border-radius: 34px; overflow: hidden; position: relative;
    box-shadow: 0 30px 70px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.07);
    display: flex; flex-direction: column;
  }
  .plateau { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: ${UNITE * 0.7}px; }
  .rangee { display: flex; gap: 16px; align-items: flex-end; }

  /* Le sélecteur pour sauter d'une direction à l'autre sans retaper l'adresse. */
  .saut { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 9;
    display: flex; gap: 2px; padding: 3px; border-radius: 999px;
    background: rgba(20,20,24,.86); backdrop-filter: blur(10px);
    box-shadow: 0 6px 22px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.1); }
  .saut a { font: 500 .72rem/1 ui-sans-serif, system-ui, sans-serif; color: #b9b9c4;
    text-decoration: none; padding: 8px 14px; border-radius: 999px; }
  .saut a.ici { background: #e9e9ec; color: #17181c; }

  /* Sur téléphone : plus de fiche, l'écran de jeu prend tout. C'est là qu'on
     juge vraiment une direction — dans la main, pas dans une maquette. */
  @media (max-width: 900px) {
    body { padding: 0; display: block; background: #000; }
    .fiche { display: none; }
    /* Le sélecteur flotte au-dessus : on lui réserve sa place, sinon il
       recouvre la barre de boutons — justement ce qu'on vient juger. */
    .tel { width: 100vw; height: 100dvh; border-radius: 0; box-shadow: none;
      padding-bottom: calc(env(safe-area-inset-bottom) + 56px); }
    .saut { bottom: calc(env(safe-area-inset-bottom) + 10px); }
  }
  ${d.css}
</style></head><body>
<div class="fiche">
  <h1>${d.nom}</h1>
  <div class="quoi">${d.quoi}</div>
  ${d.texte}
  <ul>
    <li><i>Fond</i><span>${d.resume.fond}</span></li>
    <li><i>Accent</i><span>${d.resume.accent}</span></li>
    <li><i>Typo</i><span>${d.resume.typo}</span></li>
    <li><i>Le liquide</i><span>${d.resume.liquide}</span></li>
    <li><i>Le risque</i><span>${d.resume.risque}</span></li>
  </ul>
</div>
<div class="tel">
  ${d.entete}
  <div class="plateau">${rangees}</div>
  ${d.barre}
</div>
<nav class="saut" id="saut"></nav>
<script>
  // Les trois directions tournent sur trois ports du même hôte : on reconstruit
  // les liens depuis l'adresse courante pour que ça marche aussi depuis le
  // téléphone, où l'hôte n'est pas « localhost ».
  var LIENS = [['Laboratoire', 4401], ['Washi', 4402], ['Laque', 4403]]
  document.getElementById('saut').innerHTML = LIENS.map(function (l) {
    var ici = String(location.port) === String(l[1]) ? ' class="ici"' : ''
    return '<a' + ici + ' href="' + location.protocol + '//' + location.hostname + ':' + l[1] + '/">' + l[0] + '</a>'
  }).join('')
</script>
</body></html>
`
}

// =========================================================== 1. LABORATOIRE ==
const laboratoire = {
  nom: 'Laboratoire',
  quoi: 'Instrument de précision',
  fichier: 'laboratoire.html',
  themeColor: '#0d1117',
  // Désaturation FRANCHE : à 0,82 les couleurs restaient des bonbons et la
  // promesse « ce sont des réactifs » était démentie par l'écran.
  teinte: { sat: 0.48, lum: -0.07, ecart: 0.12, satHaut: 0.85 },
  texte: `
    <p>De la <b>verrerie scientifique</b> : verre épais, ménisque incurvé à la surface de
    chaque liquide, graduations gravées le long du plateau. Les couleurs sont désaturées —
    ce sont des réactifs, pas des bonbons.</p>
    <p>La noblesse vient de la <b>précision affichée</b> : chiffres tabulaires, filets d’or
    d’un demi-pixel, un compteur qui ressemble à un relevé. Le jeu se donne pour ce qu’il
    est — un problème qu’on résout — au lieu de se déguiser en jeu d’enfant.</p>
    <p>C’est la direction qui <b>capitalise sur le solveur</b> : le « minimum 37 coups » n’est
    plus une note en bas d’écran, c’est la mesure affichée par l’appareil.</p>`,
  resume: {
    fond: 'Bleu d’encre #0d1117, vignettage',
    accent: 'Laiton #c8a45c',
    typo: 'ui-serif (New York) + chiffres tabulaires',
    liquide: 'Réactif mat, ménisque courbe',
    risque: 'Froid si on pousse trop la désaturation',
  },
  css: `
  .tel { background: radial-gradient(120% 70% at 50% -10%, #16202b 0%, #0d1117 62%); }
  .tel::after { content:''; position:absolute; inset:0; pointer-events:none;
    box-shadow: inset 0 0 120px rgba(0,0,0,.55); }
  .entete { padding: 20px 22px 6px; display:flex; align-items:baseline; justify-content:space-between;
    border-bottom: 1px solid rgba(200,164,92,.16); }
  .marque { font-family: ui-serif, Georgia, serif; font-size: .95rem; letter-spacing: .3em; color:#c8a45c; }
  .releve { text-align:right; font-variant-numeric: tabular-nums; }
  .releve b { display:block; font-family: ui-serif, Georgia, serif; font-weight:500; font-size:1.15rem; color:#e8eef5; }
  .releve span { font-size:.66rem; letter-spacing:.14em; text-transform:uppercase; color:#7d8a99; }
  .tube { position:relative; width:${LARGEUR}px; height:${HAUTEUR * UNITE + 12}px; }
  .verre { position:absolute; inset:0; border-radius: 5px 5px ${LARGEUR * 0.46}px ${LARGEUR * 0.46}px;
    border:1px solid rgba(214,228,240,.22); background: rgba(190,215,240,.045);
    box-shadow: inset -3px 0 7px rgba(255,255,255,.07), inset 3px 0 6px rgba(0,0,0,.4); }
  .liquide { position:absolute; left:3px; right:3px; top:12px; height:${HAUTEUR * UNITE}px;
    display:flex; flex-direction:column-reverse; }
  .u { position:relative; height:${UNITE}px; flex:none; transition: transform .2s; }
  .u.bas { border-radius: 0 0 ${LARGEUR * 0.4}px ${LARGEUR * 0.4}px; }
  /* le ménisque : la surface du liquide se creuse contre le verre */
  .u.haut::before { content:''; position:absolute; left:-1px; right:-1px; top:-5px; height:10px;
    border-radius:50%; background:inherit; filter:brightness(1.22); }
  .u.haut::after { content:''; position:absolute; left:-1px; right:-1px; top:-7px; height:7px;
    border-radius:50%; border-top:1px solid rgba(255,255,255,.3); }
  .u.leve { transform: translateY(-26px); }
  .grad { position:absolute; left:-9px; top:14px; height:${HAUTEUR * UNITE - 6}px; width:6px; }
  .grad i { position:absolute; left:0; height:1px; background:rgba(200,164,92,.4); }
  .choisi .verre { border-color: rgba(200,164,92,.85);
    box-shadow: 0 0 0 1px rgba(200,164,92,.3), 0 0 22px rgba(200,164,92,.22), inset 3px 0 6px rgba(0,0,0,.4); }
  .barre { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:rgba(200,164,92,.16);
    border-top:1px solid rgba(200,164,92,.22); }
  .barre button { background:#0d1117; border:0; color:#9fb0c2; padding:16px 4px 20px;
    font-size:.68rem; letter-spacing:.15em; text-transform:uppercase; font-family:inherit; }
  .barre button.actif { color:#c8a45c; }`,
  entete: `<div class="entete">
      <span class="marque">IRO</span>
      <span class="releve"><b>18 / 37</b><span>coups · minimum</span></span>
    </div>`,
  barre: `<div class="barre">
      <button>Annuler</button><button>Reprendre</button><button class="actif">Indice</button>
    </div>`,
  tube: (unites, { vide, choisi }) => `<div class="tube ${choisi ? 'choisi' : ''}">
      <div class="grad">${Array.from({ length: HAUTEUR * 2 + 1 }, (_, i) =>
    `<i style="top:${(i * (HAUTEUR * UNITE - 6)) / (HAUTEUR * 2)}px;width:${i % 2 ? 3 : 6}px"></i>`).join('')}</div>
      <div class="verre"></div>
      <div class="liquide">${unites}</div>
    </div>`,
  unite: (c, { premier, dernier, leve }) => `<div class="u ${premier ? 'bas' : ''} ${dernier ? 'haut' : ''} ${leve ? 'leve' : ''}"
      style="background:linear-gradient(180deg, ${c.haut}, ${c.milieu} 45%, ${c.bas})"></div>`,
}

// ================================================================= 2. WASHI ==
const washi = {
  nom: 'Washi',
  quoi: 'Papier et encre',
  fichier: 'washi.html',
  themeColor: '#ece5d7',
  teinte: { sat: 0.52, lum: 0.1, ecart: 0.07, satHaut: 0.85 },
  texte: `
    <p>La rupture franche : <b>on quitte le noir</b>. Fond de papier japonais chaud, grain
    visible, tubes tracés à l’encre d’un trait qui s’épaissit en bas. Les liquides sont des
    <b>lavis</b> — aplats mats, légèrement transparents, comme posés au pinceau.</p>
    <p>Ici la classe vient du <b>vide</b>. Beaucoup de marge, peu de traits, un seul rouge de
    sceau pour l’action. C’est l’exact opposé de tous les jeux de tubes du marché, qui sont
    tous néon sur noir — c’est aussi ce qui le rendrait <b>reconnaissable en capture d’écran</b>.</p>
    <p>Le nom du jeu y prend enfin son sens : <b>色</b> devient le sceau rouge en bas de page,
    comme la signature d’une estampe.</p>`,
  resume: {
    fond: 'Papier #efe9dd, grain fin',
    accent: 'Rouge de sceau #b7352d',
    typo: 'ui-serif + Hiragino Mincho pour 色',
    liquide: 'Lavis mat, légèrement transparent',
    risque: 'Le clair fatigue plus l’œil le soir',
  },
  css: `
  .tel { background:
      radial-gradient(120% 80% at 30% 0%, #f6f1e6 0%, #ece5d7 60%, #e4dcca 100%);
    color:#2a2622; }
  .tel::before { content:''; position:absolute; inset:0; pointer-events:none; opacity:.5;
    background-image:
      radial-gradient(rgba(120,100,70,.09) .6px, transparent .7px),
      radial-gradient(rgba(120,100,70,.06) .6px, transparent .7px);
    background-size: 7px 7px, 11px 11px; background-position: 0 0, 4px 5px; }
  .entete { padding:26px 26px 4px; display:flex; align-items:flex-end; justify-content:space-between; }
  .marque { font-family: ui-serif, Georgia, serif; font-size:1.35rem; letter-spacing:.24em; color:#2a2622; }
  .marque em { font-style:normal; font-family:'Hiragino Mincho ProN', ui-serif, serif; color:#b7352d; margin-left:.3em; }
  .releve { text-align:right; font-family: ui-serif, Georgia, serif; }
  .releve b { display:block; font-weight:500; font-size:1rem; }
  .releve span { font-size:.68rem; color:#8a8175; }
  .trait { height:1px; margin:12px 26px 0; background:linear-gradient(90deg, #2a2622, rgba(42,38,34,.05)); }
  .tube { position:relative; width:${LARGEUR}px; height:${HAUTEUR * UNITE + 10}px; }
  .verre { position:absolute; inset:0; border-radius: 3px 3px ${LARGEUR * 0.45}px ${LARGEUR * 0.45}px;
    border:2px solid #2a2622; border-top:0;
    box-shadow: 0 3px 0 rgba(42,38,34,.55), 1px 0 0 rgba(42,38,34,.3);
    background: rgba(255,255,255,.34); }
  .liquide { position:absolute; left:2px; right:2px; top:10px; height:${HAUTEUR * UNITE}px;
    display:flex; flex-direction:column-reverse; }
  .u { position:relative; height:${UNITE}px; flex:none; transition:transform .2s; mix-blend-mode:multiply; opacity:.92; }
  .u.bas { border-radius: 0 0 ${LARGEUR * 0.38}px ${LARGEUR * 0.38}px; }
  .u.haut { border-radius: 2px 2px 0 0; }
  .u.leve { transform: translateY(-26px); }
  .choisi .verre { border-color:#b7352d; box-shadow: 0 2px 0 rgba(183,53,45,.4), 0 0 0 3px rgba(183,53,45,.1); }
  .sceau { position:absolute; right:24px; bottom:96px; width:34px; height:34px; border-radius:4px;
    background:#b7352d; color:#f6f1e6; display:flex; align-items:center; justify-content:center;
    font-family:'Hiragino Mincho ProN', ui-serif, serif; font-size:1.15rem; }
  .barre { display:flex; justify-content:space-between; padding:18px 26px 26px; }
  .barre button { background:none; border:0; font-family:ui-serif, Georgia, serif; font-size:.86rem;
    color:#5c554b; border-bottom:1px solid rgba(42,38,34,.25); padding:2px 1px; }
  .barre button.actif { color:#b7352d; border-color:#b7352d; }`,
  entete: `<div class="entete">
      <span class="marque">IRO<em>色</em></span>
      <span class="releve"><b>18 coups</b><span>minimum 37</span></span>
    </div><div class="trait"></div>`,
  barre: `<div class="sceau">色</div><div class="barre">
      <button>Annuler</button><button>Reprendre</button><button class="actif">Indice</button>
    </div>`,
  tube: (unites, { vide, choisi }) => `<div class="tube ${choisi ? 'choisi' : ''}">
      <div class="verre"></div><div class="liquide">${unites}</div>
    </div>`,
  unite: (c, { premier, dernier, leve }) => `<div class="u ${premier ? 'bas' : ''} ${dernier ? 'haut' : ''} ${leve ? 'leve' : ''}"
      style="background:${c.pur}"></div>`,
}

// ================================================================= 3. LAQUE ==
const laque = {
  nom: 'Laque',
  quoi: 'Boîte à bijoux',
  fichier: 'laque.html',
  themeColor: '#08070a',
  // Une gemme est PROFONDE : on assombrit et on retient la saturation, sinon on
  // obtient du bonbon verni, pas de la pierre taillée.
  teinte: { sat: 0.86, lum: -0.11, ecart: 0.2, satHaut: 0.6 },
  texte: `
    <p>Noir de laque profond, et les liquides deviennent des <b>pierres taillées</b> : biseau
    en haut de chaque unité, éclat spéculaire net, ombre portée à l’intérieur du verre. Le
    verre lui-même disparaît, il ne reste qu’un <b>liseré d’or</b>.</p>
    <p>C’est la direction la plus proche de l’actuelle — donc la moins risquée — mais elle
    change ce qu’on regarde : aujourd’hui on voit des <b>blocs de couleur</b>, ici on verrait
    des <b>objets précieux</b>. Un tube terminé s’ourle d’or : ranger devient une récompense
    visuelle, pas juste une case cochée.</p>
    <p>C’est aussi celle qui demande le plus de <b>place vide</b> autour du plateau — ce que
    tes tubes réduits de moitié viennent justement de libérer.</p>`,
  resume: {
    fond: 'Laque #08070a, halo chaud très doux',
    accent: 'Or mat #c9a227',
    typo: 'ui-serif très espacée',
    liquide: 'Gemme : biseau, éclat, ombre interne',
    risque: 'L’or vire au clinquant s’il est saturé',
  },
  css: `
  .tel { background: radial-gradient(140% 60% at 50% -8%, #1b1512 0%, #0b0a0c 55%, #08070a 100%); }
  .tel::after { content:''; position:absolute; inset:0; pointer-events:none; opacity:.35;
    background-image: radial-gradient(rgba(255,255,255,.05) .5px, transparent .6px);
    background-size: 3px 3px; }
  .entete { padding:26px 24px 8px; text-align:center; }
  .marque { font-family: ui-serif, Georgia, serif; font-size:1.05rem; letter-spacing:.52em;
    color:#c9a227; text-indent:.52em; display:block; }
  .filet { height:1px; margin:14px auto 0; width:64px;
    background:linear-gradient(90deg, transparent, rgba(201,162,39,.7), transparent); }
  .releve { margin-top:14px; font-family:ui-serif, Georgia, serif; color:#efe7d8; font-size:1.05rem; font-weight:500; }
  .releve span { display:block; font-family:ui-sans-serif, system-ui, sans-serif;
    font-size:.64rem; letter-spacing:.2em; text-transform:uppercase; color:#7a6f5c; margin-top:5px; }
  .tube { position:relative; width:${LARGEUR}px; height:${HAUTEUR * UNITE + 8}px; }
  .verre { position:absolute; inset:0; border-radius: 4px 4px ${LARGEUR * 0.47}px ${LARGEUR * 0.47}px;
    border:1px solid rgba(201,162,39,.28); background:rgba(255,255,255,.018); }
  .liquide { position:absolute; left:3px; right:3px; top:8px; height:${HAUTEUR * UNITE}px;
    display:flex; flex-direction:column-reverse; }
  .u { position:relative; height:${UNITE}px; flex:none; transition:transform .2s;
    box-shadow: inset 0 -5px 9px rgba(0,0,0,.42), inset 0 2px 0 rgba(255,255,255,.3); }
  .u::after { content:''; position:absolute; left:14%; top:12%; width:20%; height:44%;
    border-radius:999px; background:linear-gradient(180deg, rgba(255,255,255,.62), rgba(255,255,255,0)); }
  .u.bas { border-radius: 0 0 ${LARGEUR * 0.42}px ${LARGEUR * 0.42}px; }
  .u.haut { border-radius: 3px 3px 0 0; }
  .u.leve { transform: translateY(-26px); }
  .choisi .verre { border-color:rgba(201,162,39,.9); box-shadow: 0 0 18px rgba(201,162,39,.28); }
  .range .verre { border-color:rgba(201,162,39,.75); box-shadow: 0 0 26px rgba(201,162,39,.3); }
  .barre { display:flex; justify-content:center; gap:34px; padding:20px 0 30px; }
  .barre button { background:none; border:0; color:#8b8172; font-family:ui-serif, Georgia, serif;
    font-size:.8rem; letter-spacing:.16em; }
  .barre button.actif { color:#c9a227; }`,
  entete: `<div class="entete">
      <span class="marque">IRO</span><div class="filet"></div>
      <div class="releve">18<span>coups · minimum 37</span></div>
    </div>`,
  barre: `<div class="barre">
      <button>Annuler</button><button>Reprendre</button><button class="actif">Indice</button>
    </div>`,
  tube: (unites, { vide, choisi }) => `<div class="tube ${choisi ? 'choisi' : ''}">
      <div class="verre"></div><div class="liquide">${unites}</div>
    </div>`,
  unite: (c, { premier, dernier, leve }) => `<div class="u ${premier ? 'bas' : ''} ${dernier ? 'haut' : ''} ${leve ? 'leve' : ''}"
      style="background:linear-gradient(168deg, ${c.haut} 0%, ${c.milieu} 42%, ${c.bas} 100%)"></div>`,
}

for (const d of [laboratoire, washi, laque]) {
  writeFileSync(join(sortie, d.fichier), ecran(d))
}
console.log('  3 directions écrites dans design/directions/')
