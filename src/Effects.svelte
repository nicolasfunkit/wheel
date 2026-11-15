<script>
  import { onMount } from 'svelte'
  import { Application, Graphics, Sprite, Texture } from 'pixi.js'
  import { reducedMotion } from './motion.js'

  // `target`: the SVG element of the wheel rim, used to align the effects on it.
  let { target } = $props()

  const SPIN_EFFECTS = ['sparks', 'comets', 'warp', 'spray']
  const WAVE_LOBES = 9
  const WAVE_POINTS = 120

  let host
  let spinEffect = null // effect picked at random for the current spin
  let intensity = 0 // wheel speed, between 0 and 1
  let wheel = { cx: 0, cy: 0, r: 0 }
  let spinTime = 0
  let waveAcc = 0
  let emitAcc = 0
  let rings = []
  let ringsEnabled = true
  let app = null
  let glow = null
  let particles = []
  let queue = [] // deferred actions: { delay (s), run }

  const rand = (min, max) => min + Math.random() * (max - min)

  // hsl (h in degrees, s and l between 0 and 1) -> 0xRRGGBB
  function hsl(h, s, l) {
    const a = s * Math.min(l, 1 - l)
    const f = (n) => {
      const k = (n + h / 30) % 12
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
    }
    return (f(0) << 16) | (f(8) << 8) | f(4)
  }

  function makeGlowTexture() {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.8)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    return Texture.from(canvas)
  }

  function add(sprite, props) {
    sprite.anchor.set(0.5)
    app.stage.addChild(sprite)
    particles.push({ sprite, age: 0, ...props })
  }

  // Confetti cannon: burst from (x, y) in the direction `angle` (radians).
  function cannon(x, y, angle, count = 110) {
    const power = Math.max(app.screen.height, 500)
    for (let i = 0; i < count; i++) {
      const a = angle + rand(-0.35, 0.35)
      const speed = rand(0.7, 1.7) * power
      const sprite = new Sprite(Texture.WHITE)
      sprite.tint = hsl(rand(0, 360), 0.9, 0.6)
      sprite.position.set(x, y)
      sprite.rotation = rand(0, Math.PI * 2)
      add(sprite, {
        kind: 'confetti',
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        gravity: 900,
        drag: 1.6,
        life: rand(2.5, 4),
        spin: rand(-8, 8),
        flutter: rand(6, 14),
        phase: rand(0, Math.PI * 2),
        w: rand(6, 10),
        h: rand(10, 16),
      })
    }
  }

  // Firework: glowing sparks (additive blending) around (x, y).
  function firework(x, y, count = 90) {
    const hue = rand(0, 360)
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2)
      const speed = rand(80, 520)
      const sprite = new Sprite(glow)
      sprite.blendMode = 'add'
      sprite.tint = hsl((hue + rand(-25, 25) + 360) % 360, 1, 0.6)
      sprite.position.set(x, y)
      add(sprite, {
        kind: 'spark',
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        gravity: 160,
        drag: 1.8,
        life: rand(0.8, 1.7),
        size: rand(0.25, 0.6),
      })
    }
    // Central flash
    const flash = new Sprite(glow)
    flash.blendMode = 'add'
    flash.position.set(x, y)
    add(flash, { kind: 'spark', vx: 0, vy: 0, gravity: 0, drag: 0, life: 0.35, size: 5 })
  }

  function glowParticle(x, y, vx, vy, tint, props) {
    const sprite = new Sprite(glow)
    sprite.blendMode = 'add'
    sprite.tint = tint
    sprite.position.set(x, y)
    add(sprite, { kind: 'spark', vx, vy, gravity: 0, drag: 0, ...props })
  }

  // Number of particles to emit this frame for a given rate (per second).
  function emitCount(rate, dt) {
    emitAcc += rate * dt
    const n = Math.floor(emitAcc)
    emitAcc -= n
    return n
  }

  function spawnRing() {
    const g = new Graphics()
    g.blendMode = 'add'
    app.stage.addChild(g)
    rings.push({ g, age: 0, life: 1.5, hue: (spinTime * 90) % 360, phase: rand(0, Math.PI * 2) })
  }

  // Waves: wavy rings that start at the wheel center and expand.
  function updateRings(dt) {
    waveAcc += dt * (1 + 3 * intensity)
    if (spinEffect && ringsEnabled && waveAcc >= 1) {
      waveAcc -= 1
      spawnRing()
    }

    rings = rings.filter((ring) => {
      ring.age += dt
      const t = ring.age / ring.life
      if (t >= 1) {
        ring.g.destroy()
        return false
      }
      const radius = wheel.r * (0.12 + 1.2 * t)
      const amplitude = radius * 0.05 * (0.4 + intensity)
      const points = []
      for (let i = 0; i < WAVE_POINTS; i++) {
        const a = (i / WAVE_POINTS) * Math.PI * 2
        const r = radius + amplitude * Math.sin(a * WAVE_LOBES + ring.phase + ring.age * 7)
        points.push(wheel.cx + Math.cos(a) * r, wheel.cy + Math.sin(a) * r)
      }
      ring.g
        .clear()
        .poly(points)
        .stroke({
          width: 2 + 5 * (1 - t),
          color: hsl(ring.hue, 1, 0.7),
          alpha: Math.sin(Math.PI * t) * (0.25 + 0.45 * intensity),
        })
      return true
    })
  }

  const spinEmitters = {
    // Friction sparks at the pointer.
    sparks(dt) {
      for (let n = emitCount(260 * intensity, dt); n > 0; n--) {
        const a = rand(-0.6, 0.25)
        const speed = 100 + rand(200, 750) * intensity
        glowParticle(
          wheel.cx,
          wheel.cy - wheel.r,
          Math.cos(a) * speed,
          Math.sin(a) * speed,
          hsl(rand(20, 55), 1, 0.6),
          { gravity: 700, life: rand(0.3, 0.8), size: rand(0.12, 0.3) },
        )
      }
    },
    // Three comets orbiting the wheel rim.
    comets() {
      const base = spinTime * (1 + 7 * intensity)
      for (let i = 0; i < 3; i++) {
        const a = base + (i * Math.PI * 2) / 3
        for (let n = 0; n < 2; n++) {
          glowParticle(
            wheel.cx + Math.cos(a) * wheel.r * 1.02 + rand(-3, 3),
            wheel.cy + Math.sin(a) * wheel.r * 1.02 + rand(-3, 3),
            rand(-25, 25),
            rand(-25, 25),
            hsl((i * 120 + spinTime * 50) % 360, 1, 0.65),
            { life: rand(0.4, 0.9), size: rand(0.25, 0.5) },
          )
        }
      }
    },
    // Hyperspace: stars streak from the center outwards.
    warp(dt) {
      for (let n = emitCount(20 + 170 * intensity, dt); n > 0; n--) {
        const a = rand(0, Math.PI * 2)
        const start = rand(0.1, 0.35) * wheel.r
        const speed = rand(250, 800) * (0.3 + intensity)
        glowParticle(
          wheel.cx + Math.cos(a) * start,
          wheel.cy + Math.sin(a) * start,
          Math.cos(a) * speed,
          Math.sin(a) * speed,
          hsl(rand(190, 250), 1, 0.85),
          { drag: -1.2, life: rand(0.7, 1.3), size: rand(0.08, 0.2) },
        )
      }
    },
    // Rainbow spray flung out by centrifugal force.
    spray(dt) {
      for (let n = emitCount(10 + 220 * intensity, dt); n > 0; n--) {
        const a = rand(0, Math.PI * 2)
        const tangent = rand(200, 550) * intensity
        const radial = rand(40, 200)
        glowParticle(
          wheel.cx + Math.cos(a) * wheel.r,
          wheel.cy + Math.sin(a) * wheel.r,
          -Math.sin(a) * tangent + Math.cos(a) * radial,
          Math.cos(a) * tangent + Math.sin(a) * radial,
          hsl(((a * 180) / Math.PI + spinTime * 60 + 360) % 360, 1, 0.6),
          { drag: 1.5, life: rand(0.5, 1.1), size: rand(0.12, 0.3) },
        )
      }
    },
  }

  // Call when the wheel is launched: picks a random effect.
  export function spinStart({ rings: withRings = true } = {}) {
    ringsEnabled = withRings
    if (!app || !target || reducedMotion()) return
    const a = target.getBoundingClientRect()
    const b = host.getBoundingClientRect()
    wheel = { cx: a.left - b.left + a.width / 2, cy: a.top - b.top + a.height / 2, r: a.width / 2 }
    spinEffect = SPIN_EFFECTS[Math.floor(Math.random() * SPIN_EFFECTS.length)]
    intensity = 1
    spinTime = 0
    waveAcc = 1 // first ring right away
    emitAcc = 0
    app.ticker.start()
  }

  // Call every frame while the wheel is spinning (ratio between 0 and 1).
  export function spinSpeed(ratio) {
    intensity = Math.max(0, Math.min(1, ratio))
  }

  export function spinEnd() {
    spinEffect = null
  }

  function tick(ticker) {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05)

    if (spinEffect) {
      spinTime += dt
      spinEmitters[spinEffect](dt)
    }
    updateRings(dt)

    queue = queue.filter((item) => {
      item.delay -= dt
      if (item.delay > 0) return true
      item.run()
      return false
    })

    particles = particles.filter((p) => {
      p.age += dt
      if (p.age >= p.life) {
        p.sprite.destroy()
        return false
      }
      const damping = Math.exp(-p.drag * dt)
      p.vx *= damping
      p.vy = p.vy * damping + p.gravity * dt
      p.sprite.x += p.vx * dt
      p.sprite.y += p.vy * dt

      const remaining = 1 - p.age / p.life
      if (p.kind === 'confetti') {
        p.sprite.rotation += p.spin * dt
        p.sprite.width = p.w
        p.sprite.height = p.h * Math.abs(Math.cos(p.phase + p.age * p.flutter)) + 1
        p.sprite.alpha = Math.min(1, remaining * 5)
      } else {
        p.sprite.scale.set(p.size * (0.4 + 0.6 * remaining))
        p.sprite.alpha = remaining
      }
      return true
    })

    if (!spinEffect && particles.length === 0 && queue.length === 0 && rings.length === 0) {
      app.render() // clear the last frame before pausing rendering
      app.ticker.stop()
    }
  }

  export function celebrate() {
    spinEffect = null
    if (!app || reducedMotion()) return
    const { width: w, height: h } = app.screen

    cannon(0, h, -Math.PI / 3)
    cannon(w, h, (-2 * Math.PI) / 3)
    firework(w / 2, h / 2, 140)
    for (let i = 1; i <= 6; i++) {
      queue.push({
        delay: i * 0.35,
        run: () => firework(rand(0.15, 0.85) * w, rand(0.1, 0.6) * h),
      })
    }
    app.ticker.start()
  }

  onMount(() => {
    let destroyed = false
    const pixi = new Application()

    pixi
      .init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        autoStart: false,
      })
      .then(() => {
        if (destroyed) {
          pixi.destroy(true, { children: true })
          return
        }
        // PixiJS owns its canvas; `host` is an empty element Svelte never touches.
        // eslint-disable-next-line svelte/no-dom-manipulating
        host.appendChild(pixi.canvas)
        glow = makeGlowTexture()
        pixi.ticker.add(tick)
        app = pixi
      })
      // No usable renderer: the wheel still works, just without effects.
      .catch((error) => console.warn('Effects disabled:', error))

    return () => {
      destroyed = true
      if (app) {
        app.destroy(true, { children: true })
        glow?.destroy(true)
        app = null
        particles = []
        queue = []
        rings = []
        spinEffect = null
      }
    }
  })
</script>

<div class="effects" bind:this={host}></div>

<style>
  .effects {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
</style>
