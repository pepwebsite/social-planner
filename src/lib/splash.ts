/** Chiude la schermata di apertura (definita in index.html) quando l'app è pronta */

let done = false

// Durata minima dell'animazione, contata da quando la schermata compare
const MIN_VISIBLE_MS = 2000

export function hideSplash() {
  if (done) return
  done = true
  const el = document.getElementById('splash')
  if (!el) return
  const start = (window as unknown as { __splashStart?: number }).__splashStart ?? 0
  const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - start))
  setTimeout(() => {
    el.classList.add('out')
    setTimeout(() => el.remove(), 650)
  }, wait)
}
