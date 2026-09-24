/** Chiude la schermata di apertura (definita in index.html) quando l'app è pronta */

let done = false

export function hideSplash() {
  if (done) return
  done = true
  const el = document.getElementById('splash')
  if (!el) return
  let quick = false
  try {
    quick = Boolean(sessionStorage.getItem('sp-seen'))
    sessionStorage.setItem('sp-seen', '1')
  } catch {
    /* storage non disponibile */
  }
  // Lascia finire l'animazione del logo la prima volta; nelle riaperture è quasi istantanea
  const minimum = quick ? 350 : 1500
  const wait = Math.max(0, minimum - performance.now())
  setTimeout(() => {
    el.classList.add('out')
    setTimeout(() => el.remove(), 650)
  }, wait)
}
