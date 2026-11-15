import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MAX_SPEED,
  MIN_LAUNCH_SPEED,
  MIN_SPEED,
  indexAtPointer,
  randomSpin,
  speedAt,
  travelAt,
} from '../src/spin.js'

// Small seeded PRNG (mulberry32), so the statistical test is reproducible.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const winnerOf = (force, count, from = 0) =>
  indexAtPointer(from + randomSpin(() => force).travel, count)

test('the force range covers a whole number of turns', () => {
  const extra = randomSpin(() => 1).travel - randomSpin(() => 0).travel
  const turns = extra / 360
  assert.ok(turns >= 1, 'at least one full extra turn')
  assert.ok(Math.abs(turns - Math.round(turns)) < 1e-9, `${turns} extra turns is not whole`)
})

test('travel grows linearly with the force', () => {
  const at = (force) => randomSpin(() => force).travel
  const expected = (at(0) + at(1)) / 2
  assert.ok(Math.abs(at(0.5) - expected) < 1e-6)
})

test('evenly spread forces give every slice exactly the same number of wins', () => {
  const turns = Math.round((randomSpin(() => 1).travel - randomSpin(() => 0).travel) / 360)
  for (const count of [1, 2, 3, 5, 8, 13, 50]) {
    for (const from of [0, 77.7, 359.9]) {
      // An even number of samples per slice and per turn, taken at mid-steps, never lands
      // exactly on a slice boundary.
      const perSlice = 20
      const samples = count * turns * perSlice
      const wins = new Array(count).fill(0)
      for (let i = 0; i < samples; i++) wins[winnerOf((i + 0.5) / samples, count, from)]++
      assert.deepEqual(
        wins,
        new Array(count).fill(turns * perSlice),
        `${count} slices starting at ${from}°`,
      )
    }
  }
})

test('random spins pick winners uniformly (chi-square)', () => {
  const count = 8
  const spins = 80_000
  const random = seeded(12345)
  const wins = new Array(count).fill(0)
  for (let i = 0; i < spins; i++) wins[indexAtPointer(randomSpin(random).travel, count)]++

  const expected = spins / count
  const chi2 = wins.reduce((sum, n) => sum + (n - expected) ** 2 / expected, 0)
  // 7 degrees of freedom: 24.32 is the critical value at p = 0.001.
  assert.ok(chi2 < 24.32, `chi² = ${chi2.toFixed(2)}, wins = ${wins}`)
})

test('launch speed stays within its bounds', () => {
  assert.equal(randomSpin(() => 0).speed, MIN_LAUNCH_SPEED)
  assert.equal(randomSpin(() => 1).speed, MAX_SPEED)
})

test('the animation ends exactly at the announced distance, at minimum speed', () => {
  const spin = randomSpin(() => 0.42)
  assert.equal(travelAt(spin, 0), 0)
  assert.equal(travelAt(spin, spin.duration), spin.travel)
  assert.equal(travelAt(spin, spin.duration + 10), spin.travel)
  assert.ok(Math.abs(speedAt(spin, spin.duration) - MIN_SPEED) < 1e-9)
  // the wheel only ever moves forward
  let last = 0
  for (let t = 0; t <= spin.duration; t += 0.05) {
    const travel = travelAt(spin, t)
    assert.ok(travel >= last)
    last = travel
  }
})

test('indexAtPointer maps a clockwise rotation to the slice under the pointer', () => {
  assert.equal(indexAtPointer(0, 4), 0)
  assert.equal(indexAtPointer(1, 4), 3) // turning clockwise brings the last slice under the pointer
  assert.equal(indexAtPointer(91, 4), 2)
  assert.equal(indexAtPointer(359, 4), 0)
  assert.equal(indexAtPointer(360 * 5 + 181, 4), 1)
  assert.equal(indexAtPointer(123.4, 1), 0)
})
