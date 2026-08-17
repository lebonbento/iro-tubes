// Fabrique le système de design d'IRO, à pousser sur Claude Design.
//
// 🔑 Rien n'est redessiné ici : la feuille de style embarquée est CELLE DU JEU
// (prise dans dist/ après `npm run build`) et les couleurs viennent de
// src/couleurs.js. Un système de design qui diverge du produit ne sert à rien —
// il faut pouvoir le régénérer d'une commande quand le jeu bouge.
//
//   npm run build && npm run design

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PALETTE, MOTIFS, repartition } from '../src/couleurs.js'

const ici = dirname(fileURLToPath(import.meta.url))
const racine = join(ici, '..')
const sortie = join(racine, 'design')

const dossierActifs = join(racine, 'dist', 'assets')
const nomCss = readdirSync(dossierActifs).find((f) => f.endsWith('.css'))
if (!nomCss) throw new Error('Aucune CSS dans dist/ — lancer `npm run build` d’abord.')
const CSS = readFileSync(join(dossierActifs, nomCss), 'utf8')

mkdirSync(join(sortie, 'fondations'), { recursive: true })
mkdirSync(join(sortie, 'composants'), { recursive: true })

const page = (carte, titre, corps, style = '') => `<!-- @dsCard group="${carte.group}" -->
<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>${titre}</title>
<style>${CSS}</style>
<style>
  body { padding: 28px; display: block; height: auto; }
  .ds-titre { font-size: 1.05rem; font-weight: 700; margin-bottom: 2px; }
  .ds-sous { font-size: .78rem; color: var(--encre-douce); margin-bottom: 20px; line-height: 1.45; max-width: 46em; }
  .ds-groupe { margin-bottom: 30px; }
  .ds-etiquette { font-size: .68rem; letter-spacing: .09em; text-transform: uppercase; color: var(--encre-douce); margin-bottom: 9px; }
  .ds-ligne { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-end; }
  .ds-legende { font-size: .66rem; color: var(--encre-douce); text-align: center; margin-top: 7px; line-height: 1.3; }
  ${style}
</style></head><body>
<div class="ds-titre">${titre}</div>
<div class="ds-sous">${carte.sous}</div>
${corps}
</body></html>
`

// --- un tube, en HTML pur, avec le balisage exact du composant React --------
const uniteHtml = (teinte, unite, largeur, { bas, haut, motif, decale }) => {
  const c = PALETTE[teinte]
  const clairFond = ((h) => {
    const v = (i) => {
      const x = parseInt(h.slice(i, i + 2), 16) / 255
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * v(1) + 0.7152 * v(3) + 0.0722 * v(5) > 0.42
  })(c.fond)
  const encre = clairFond ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.66)'
  const svg = motif
    ? `<svg viewBox="0 0 100 100" class="iro-motif"><path d="${MOTIFS[teinte]}" fill="${encre}"/></svg>`
    : ''
  return `<div class="iro-unite" style="height:${unite}px;`
    + `background:linear-gradient(180deg, ${c.clair} 0%, ${c.fond} 34%, ${c.sombre} 100%);`
    + `border-bottom-left-radius:${bas ? largeur * 0.4 : 0}px;border-bottom-right-radius:${bas ? largeur * 0.4 : 0}px;`
    + `border-top-left-radius:${haut ? largeur * 0.12 : 0}px;border-top-right-radius:${haut ? largeur * 0.12 : 0}px;`
    + `${decale ? `transform:translateY(-${unite * 0.62}px);` : ''}">${svg}</div>`
}

const tubeHtml = (contenu, { hauteur = 4, largeur = 34, classe = '', leve = 0, motif = false } = {}) => {
  const unite = largeur * 0.88
  const col = unite * 0.22
  const hautVerre = hauteur * unite + col
  const rayon = `${largeur * 0.13}px ${largeur * 0.13}px ${largeur * 0.44}px ${largeur * 0.44}px`
  const marge = Math.max(1.5, largeur * 0.06)
  const unites = contenu.map((t, i) => uniteHtml(t, unite, largeur, {
    bas: i === 0,
    haut: i === contenu.length - 1,
    motif,
    decale: i >= contenu.length - leve,
  })).join('')
  return `<span class="iro-tube ${classe}" style="width:${largeur * 2}px;height:${hautVerre}px">`
    + `<span class="iro-corps" style="width:${largeur}px;height:${hautVerre}px">`
    + `<span class="iro-verre" style="border-radius:${rayon}"></span>`
    + `<span class="iro-liquide" style="height:${hauteur * unite}px;top:${col}px;left:${marge}px;right:${marge}px">${unites}</span>`
    + `<span class="iro-reflet" style="border-radius:${rayon}"></span>`
    + '</span></span>'
}

// --- 1. Les couleurs -------------------------------------------------------
{
  const carte = {
    group: 'Fondations',
    sous: 'Les douze teintes, dans l’ordre de la roue. <b>La roue boucle</b> : la première et la dernière '
      + 'sont voisines — c’est ce qui avait donné « deux rouges » séparés de ΔE 7,1, à peine perceptible. '
      + 'Les valeurs sont issues d’une recherche maximisant l’écart perceptuel minimal ; '
      + '<code>npm run test-palette</code> refuse toute paire sous ΔE 22. '
      + '<b>Le clair et le sombre sont déduits du fond</b> : une seule valeur à régler par couleur.',
  }
  const cases = PALETTE.map((c, i) => `
    <div style="text-align:center">
      <div style="width:64px;height:74px;border-radius:12px;border:1px solid var(--trait);
        background:linear-gradient(180deg, ${c.clair} 0%, ${c.fond} 34%, ${c.sombre} 100%)"></div>
      <div class="ds-legende"><b style="color:var(--encre)">${c.nom}</b><br>${c.fond}<br>
        <span style="opacity:.7">n° ${i}</span></div>
    </div>`).join('')
  const echelles = [3, 6, 9, 12].map((n) => `
    <div class="ds-groupe">
      <div class="ds-etiquette">à ${n} couleurs</div>
      <div class="ds-ligne">${repartition(n).map((t) => `
        <div style="width:44px;height:26px;border-radius:7px;background:${PALETTE[t].fond}"
             title="${PALETTE[t].nom}"></div>`).join('')}</div>
    </div>`).join('')

  writeFileSync(join(sortie, 'fondations', 'couleurs.html'), page(carte, 'Couleurs', `
    <div class="ds-groupe"><div class="ds-etiquette">la palette</div>
      <div class="ds-ligne">${cases}</div></div>
    <div class="ds-groupe"><div class="ds-etiquette">ce que voit le joueur selon le niveau</div>
      <div class="ds-sous" style="margin-bottom:14px">Un niveau ne prend pas les <i>n</i> premières couleurs :
      il les <b>étale sur toute la roue</b>. À trois couleurs on joue rouge, vert et lavande, jamais
      rouge, orange et jaune.</div>
      ${echelles}</div>`))
}

// --- 2. Les jetons ---------------------------------------------------------
{
  const carte = {
    group: 'Fondations',
    sous: 'Le fond, les encres, l’accent et les rayons. Le jeu est sombre de bout en bout : '
      + 'aucun écran blanc, pas de thème clair.',
  }
  const jetons = [
    ['--fond', '#0b0f14', 'le fond, en bas du dégradé'],
    ['--fond-haut', '#121a24', 'le fond, en haut'],
    ['--encre', '#e8edf3', 'le texte'],
    ['--encre-douce', '#93a3b6', 'le texte secondaire'],
    ['--accent', '#22d3ee', 'l’action principale, la ligne « moi » du classement'],
    ['--trait', 'rgba(255,255,255,.1)', 'les bordures'],
  ].map(([nom, valeur, role]) => `
    <div style="display:flex;align-items:center;gap:14px;padding:9px 0;border-bottom:1px solid var(--trait)">
      <span style="width:40px;height:40px;border-radius:10px;border:1px solid var(--trait);background:${valeur};flex:none"></span>
      <span><b style="font-size:.84rem">${nom}</b>
        <span style="font-size:.74rem;color:var(--encre-douce)"> ${valeur}</span><br>
        <span style="font-size:.72rem;color:var(--encre-douce)">${role}</span></span>
    </div>`).join('')

  writeFileSync(join(sortie, 'fondations', 'jetons.html'), page(carte, 'Jetons', `
    <div class="ds-groupe" style="max-width:34rem">${jetons}</div>
    <div class="ds-groupe"><div class="ds-etiquette">titres et textes</div>
      <div class="iro-titre" style="text-align:left"><strong>Niveau 37</strong><span>18 coups · minimum 50</span></div>
      <p class="iro-note" style="margin-top:12px;max-width:32em">Tous les niveaux sont vérifiés par un solveur : aucun n’est impossible.</p>
    </div>`))
}

// --- 3. Le tube ------------------------------------------------------------
{
  const carte = {
    group: 'Composants',
    sous: '🔑 <b>Le verre dessiné et la zone touchée sont deux choses différentes.</b> Le verre occupe la '
      + 'moitié de sa case ; le bouton, lui, occupe toute la case. Les rectangles pointillés ci-dessous '
      + 'montrent la cible réelle du doigt. Sans cette séparation, un verre de 18 px au niveau 60 serait '
      + 'invisable au pouce.',
    }
  const etats = [
    ['vide', tubeHtml([]), 'aucune couleur'],
    ['partiel', tubeHtml([0, 4, 4]), 'trois unités'],
    ['plein', tubeHtml([0, 4, 9, 4]), 'quatre unités'],
    ['sélectionné', tubeHtml([0, 4, 4, 4], { classe: 'est-choisi', leve: 3 }), 'le bloc du sommet se soulève'],
    ['montré', tubeHtml([0, 4, 9, 4], { classe: 'est-montre' }), 'désigné par l’indice'],
    ['rangé', tubeHtml([4, 4, 4, 4]), 'terminé'],
    ['motifs', tubeHtml([0, 4, 9, 4], { motif: true }), 'mode daltonien'],
    ['hauteur 5', tubeHtml([0, 4, 9, 4, 6], { hauteur: 5 }), 'niveaux 21 et au-delà'],
  ].map(([nom, html, note]) => `
    <div style="text-align:center">
      <div style="outline:1px dashed rgba(255,255,255,.16);outline-offset:0;display:inline-block">${html}</div>
      <div class="ds-legende"><b style="color:var(--encre)">${nom}</b><br>${note}</div>
    </div>`).join('')

  writeFileSync(join(sortie, 'composants', 'tube.html'), page(carte, 'Tube', `
    <div class="ds-groupe"><div class="ds-ligne" style="gap:26px">${etats}</div></div>`))
}

// --- 4. Le plateau ---------------------------------------------------------
{
  const carte = {
    group: 'Composants',
    sous: 'Deux rangées, chacune centrée sur elle-même — une grille CSS collerait la dernière rangée '
      + 'incomplète à gauche. L’espace au-dessus de chaque rangée est réservé au bloc soulevé.',
  }
  const plateau = (etat, hauteur, largeur) => {
    const colonnes = Math.ceil(etat.length / 2)
    const rangees = []
    for (let i = 0; i < etat.length; i += colonnes) rangees.push(etat.slice(i, i + colonnes))
    return `<div class="iro-grille" style="gap:${largeur * 0.88 * 0.62 + 10}px;padding-top:${largeur * 0.88 * 0.62}px">
      ${rangees.map((r) => `<div class="iro-rangee" style="gap:10px">
        ${r.map((t) => tubeHtml(t, { hauteur, largeur })).join('')}</div>`).join('')}
    </div>`
  }
  const n1 = repartition(3)
  const facile = [[n1[0], n1[1], n1[0], n1[2]], [n1[1], n1[2], n1[2], n1[0]], [n1[2], n1[0], n1[1], n1[1]], [], []]
  const n2 = repartition(12)
  const dur = Array.from({ length: 12 }, (_, i) => [n2[i], n2[(i + 5) % 12], n2[(i + 7) % 12], n2[(i + 3) % 12], n2[(i + 9) % 12]])
  dur.push([], [])

  writeFileSync(join(sortie, 'composants', 'plateau.html'), page(carte, 'Plateau', `
    <div class="ds-groupe"><div class="ds-etiquette">niveau 1 — 3 couleurs, tubes de 4</div>
      ${plateau(facile, 4, 30)}</div>
    <div class="ds-groupe"><div class="ds-etiquette">niveau 60 — 12 couleurs, tubes de 5</div>
      ${plateau(dur, 5, 22)}</div>`, '.iro-grille { align-items: center }'))
}

// --- 5. Les commandes ------------------------------------------------------
{
  const carte = {
    group: 'Composants',
    sous: 'La barre du bas ne bouge jamais : annuler, recommencer, indice. Un casse-tête sans « annuler » '
      + 'devient un jeu de mémoire.',
  }
  writeFileSync(join(sortie, 'composants', 'commandes.html'), page(carte, 'Commandes', `
    <div class="ds-groupe" style="max-width:22rem">
      <div class="ds-etiquette">barre de jeu</div>
      <div class="iro-barre">
        <button type="button"><span>↶</span>Annuler</button>
        <button type="button"><span>↺</span>Recommencer</button>
        <button type="button"><span>💡</span>Indice</button>
      </div>
    </div>
    <div class="ds-groupe" style="max-width:22rem">
      <div class="ds-etiquette">barre de jeu — indisponible</div>
      <div class="iro-barre">
        <button type="button" disabled><span>↶</span>Annuler</button>
        <button type="button" disabled><span>↺</span>Recommencer</button>
        <button type="button"><span>…</span>Je cherche</button>
      </div>
    </div>
    <div class="ds-groupe" style="max-width:22rem">
      <div class="ds-etiquette">boutons de panneau</div>
      <div class="iro-choix">
        <button type="button" class="iro-primaire">Niveau suivant</button>
        <button type="button">Refaire celui-ci</button>
      </div>
    </div>
    <div class="ds-groupe" style="max-width:26rem">
      <div class="ds-etiquette">alerte</div>
      <div class="iro-alerte">Plus aucun coup possible. Annulez, ou recommencez le niveau.</div>
    </div>`))
}

// --- 6. Les panneaux -------------------------------------------------------
{
  const carte = {
    group: 'Composants',
    sous: 'Un seul gabarit de panneau pour tout : victoire, règles, niveaux, classement, réglages. '
      + 'Voile sombre, flou, une carte centrée.',
  }
  const pastilles = Array.from({ length: 18 }, (_, i) => {
    const n = i + 1
    const classe = n < 7 ? 'est-fait' : n === 7 ? 'est-courant' : ''
    const detail = n < 7 ? `${9 + n * 2}` : n <= 7 ? '' : '🔒'
    return `<button class="iro-pastille ${classe}" ${n > 7 ? 'disabled' : ''}><b>${n}</b><i>${detail}</i></button>`
  }).join('')

  writeFileSync(join(sortie, 'composants', 'panneaux.html'), page(carte, 'Panneaux', `
    <div class="ds-ligne" style="align-items:flex-start;gap:24px">
      <div class="iro-panneau" style="max-width:19rem">
        <h2>Tubes rangés</h2>
        <p class="iro-score">14 coups<em> — c’est le minimum absolu, impeccable</em></p>
        <p class="iro-note">Classement mis à jour : 12 niveaux, 214 coups.</p>
        <div class="iro-choix">
          <button class="iro-primaire">Niveau 13</button>
          <button>Refaire celui-ci</button>
        </div>
      </div>
      <div class="iro-panneau" style="max-width:19rem">
        <h2>Classement mondial</h2>
        <p class="iro-note">Classé au nombre de niveaux finis, puis au total de coups.
          Chaque résultat est <b>rejoué par le serveur</b>.</p>
        <table class="iro-table">
          <thead><tr><th></th><th>Joueur</th><th>Niveaux</th><th>Coups</th><th>Parfaits</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>MIKI</td><td>28</td><td>742</td><td>19</td></tr>
            <tr class="est-moi"><td>2</td><td>FLO</td><td>26</td><td>701</td><td>14</td></tr>
            <tr><td>3</td><td>LOUKIAN</td><td>12</td><td>318</td><td>6</td></tr>
          </tbody>
        </table>
      </div>
      <div class="iro-panneau" style="max-width:19rem">
        <h2>Les niveaux</h2>
        <div class="iro-grille-niveaux">${pastilles}</div>
      </div>
    </div>`, '.iro-panneau { position: static }'))
}

console.log(`  système de design écrit dans design/ (feuille de style : dist/assets/${nomCss})`)
