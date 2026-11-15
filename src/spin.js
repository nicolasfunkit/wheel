// Spin physics: speed decays exponentially (friction) down to MIN_SPEED.
// Everything is closed-form, so the result does not depend on the frame rate.

export const FRICTION = 0.6 // speed decay rate (1/s)
export const MIN_SPEED = 3 // deg/s: below this, the wheel is considered stopped
const MIN_TURNS = 3.5
// Between the minimum and maximum force, the wheel travels a WHOLE number of extra turns:
// this is what makes the stopping position (and therefore the winner) uniform.
const RANDOM_TURNS = 4

const speedFor = (travel) => travel * FRICTION + MIN_SPEED
export const MIN_LAUNCH_SPEED = speedFor(MIN_TURNS * 360)
export const MAX_SPEED = speedFor((MIN_TURNS + RANDOM_TURNS) * 360)

// A spin: a random force (0 = weakest, 1 = strongest) sets the initial speed, and friction
// does the rest (distance and duration follow from it).
export function randomSpin(random = Math.random) {
  const force = random()
  const speed = MIN_LAUNCH_SPEED + force * (MAX_SPEED - MIN_LAUNCH_SPEED) // deg/s
  return {
    force,
    speed,
    travel: (speed - MIN_SPEED) / FRICTION, // degrees
    duration: Math.log(speed / MIN_SPEED) / FRICTION, // seconds
  }
}

// Speed (deg/s) and distance travelled (deg) t seconds after launch.
export const speedAt = (spin, t) => spin.speed * Math.exp(-FRICTION * Math.min(t, spin.duration))
export const travelAt = (spin, t) =>
  t >= spin.duration ? spin.travel : (spin.speed - speedAt(spin, t)) / FRICTION

// Index of the slice under the pointer (fixed, at the top) for a given clockwise rotation.
export function indexAtPointer(rotation, count) {
  const slice = 360 / count
  const local = (360 - (rotation % 360)) % 360
  return Math.floor(local / slice) % count
}
