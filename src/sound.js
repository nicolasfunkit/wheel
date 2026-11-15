// Sounds synthesized with the Web Audio API (no audio files).

let ctx = null
let master = null
let noise = null
let muted = false
let lastTick = 0

function audio() {
  if (muted) return null
  const AudioContext = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContext) return null
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.6
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function setMuted(value) {
  muted = value
  if (muted && ctx) ctx.suspend()
}

function noiseBuffer(ac) {
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noise
}

// Volume envelope: rises over `attack` seconds, then fades out at `end`.
function envelope(ac, start, peak, attack, end) {
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
  gain.connect(master)
  return gain
}

// Pointer "click" when a boundary between two slices passes under it.
export function tick() {
  const ac = audio()
  if (!ac || ac.currentTime - lastTick < 0.028) return
  const now = (lastTick = ac.currentTime)

  const osc = ac.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(1500, now)
  osc.frequency.exponentialRampToValueAtTime(450, now + 0.03)
  osc.connect(envelope(ac, now, 0.35, 0.002, now + 0.05))
  osc.start(now)
  osc.stop(now + 0.06)
}

// Whoosh when the wheel is launched.
export function whoosh() {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime

  const src = ac.createBufferSource()
  src.buffer = noiseBuffer(ac)
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 0.9
  filter.frequency.setValueAtTime(250, now)
  filter.frequency.exponentialRampToValueAtTime(2800, now + 0.45)
  src.connect(filter).connect(envelope(ac, now, 0.4, 0.2, now + 0.7))
  src.start(now)
  src.stop(now + 0.75)
}

// A "brass" chord: slightly detuned sawtooth waves, with a filter that opens on the attack.
function brass(ac, start, duration, freqs, level) {
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.Q.value = 1.5
  filter.frequency.setValueAtTime(500, start)
  filter.frequency.exponentialRampToValueAtTime(4200, start + 0.05)
  filter.frequency.exponentialRampToValueAtTime(1400, start + duration)
  filter.connect(envelope(ac, start, level, 0.02, start + duration))

  for (const freq of freqs) {
    for (const detune of [-7, 7]) {
      const osc = ac.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.detune.value = detune
      osc.connect(filter)
      osc.start(start)
      osc.stop(start + duration + 0.05)
    }
  }
}

// "Ta-daa!": a short chord, then a higher sustained chord with a cymbal crash.
export function tada() {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  const daa = now + 0.17

  brass(ac, now, 0.15, [196, 246.94, 293.66, 392], 0.16) // "ta": G major
  brass(ac, daa, 1.5, [261.63, 329.63, 392, 523.25, 659.25], 0.18) // "daa": C major

  const cymbal = ac.createBufferSource()
  cymbal.buffer = noiseBuffer(ac)
  const highpass = ac.createBiquadFilter()
  highpass.type = 'highpass'
  highpass.frequency.value = 5000
  cymbal.connect(highpass).connect(envelope(ac, daa, 0.2, 0.005, daa + 0.9))
  cymbal.start(daa)
  cymbal.stop(daa + 1)
}
