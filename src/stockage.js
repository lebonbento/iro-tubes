// La progression, gardée sur l'appareil. Aucun compte, aucun serveur.

const CLE = 'iro-progression'

const vierge = { termines: {}, dernier: 1, motifs: false, sons: true }

export function lire() {
  try {
    const brut = localStorage.getItem(CLE)
    if (!brut) return { ...vierge }
    const lu = JSON.parse(brut)
    return { ...vierge, ...lu, termines: { ...lu.termines } }
  } catch {
    return { ...vierge }
  }
}

export function ecrire(progression) {
  try {
    localStorage.setItem(CLE, JSON.stringify(progression))
  } catch {
    // Navigation privée, quota plein : le jeu reste jouable, on perd juste la mémoire.
  }
}
