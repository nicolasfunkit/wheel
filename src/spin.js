// Physique d'un lancer : la vitesse décroît exponentiellement (frottement) jusqu'à MIN_SPEED.
// Tout est analytique, donc le résultat ne dépend pas du nombre d'images par seconde.

export const FRICTION = 0.6 // décroissance de la vitesse (1/s)
export const MIN_SPEED = 3 // deg/s : en dessous, la roue est considérée arrêtée
const MIN_TURNS = 3.5
// Entre la force minimale et la force maximale, la roue parcourt un nombre ENTIER de tours
// en plus : c'est ce qui rend la position d'arrêt (et donc le gagnant) uniforme.
const RANDOM_TURNS = 4

const speedFor = (travel) => travel * FRICTION + MIN_SPEED
export const MIN_LAUNCH_SPEED = speedFor(MIN_TURNS * 360)
export const MAX_SPEED = speedFor((MIN_TURNS + RANDOM_TURNS) * 360)

// Un lancer : une force aléatoire (0 = le plus faible, 1 = le plus fort) donne la vitesse
// initiale, et le frottement fait le reste (distance et durée en découlent).
export function randomSpin(random = Math.random) {
  const force = random()
  const speed = MIN_LAUNCH_SPEED + force * (MAX_SPEED - MIN_LAUNCH_SPEED) // deg/s
  return {
    force,
    speed,
    travel: (speed - MIN_SPEED) / FRICTION, // degrés
    duration: Math.log(speed / MIN_SPEED) / FRICTION, // secondes
  }
}

// Vitesse (deg/s) et distance parcourue (deg) t secondes après le lancer.
export const speedAt = (spin, t) => spin.speed * Math.exp(-FRICTION * Math.min(t, spin.duration))
export const travelAt = (spin, t) =>
  t >= spin.duration ? spin.travel : (spin.speed - speedAt(spin, t)) / FRICTION

// Index du segment sous le pointeur (fixe, en haut) pour une rotation horaire donnée.
export function indexAtPointer(rotation, count) {
  const slice = 360 / count
  const local = (360 - (rotation % 360)) % 360
  return Math.floor(local / slice) % count
}
