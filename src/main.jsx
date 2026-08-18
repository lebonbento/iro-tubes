import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 🔑 Une PWA sert d'abord son cache. Sans ce qui suit, une mise à jour déployée
// reste INVISIBLE tant qu'on n'a pas tué l'application — on a cru deux fois que
// le déploiement n'était pas passé alors qu'il l'était.
// Le service worker s'active tout de suite (`skipWaiting`), mais la page déjà
// ouverte garde ses anciens fichiers : il faut la recharger quand il prend la
// main. Et on redemande une vérification chaque fois que l'app revient au
// premier plan, sinon rien ne déclenche la recherche de nouveauté.
if ('serviceWorker' in navigator) {
  const avaitUnControleur = Boolean(navigator.serviceWorker.controller)
  let dejaRechargee = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!avaitUnControleur || dejaRechargee) return // première installation : rien à recharger
    dejaRechargee = true
    window.location.reload()
  })

  const chercherUneMaj = () => navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {})
  document.addEventListener('visibilitychange', () => { if (!document.hidden) chercherUneMaj() })
  window.addEventListener('online', chercherUneMaj)
  setInterval(chercherUneMaj, 5 * 60 * 1000)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
