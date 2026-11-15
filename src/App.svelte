<script>
  import Effects from './Effects.svelte'
  import ParticipantsPanel from './ParticipantsPanel.svelte'
  import Wheel from './Wheel.svelte'
  import WinnerBanner from './WinnerBanner.svelte'
  import { reducedMotion } from './motion.js'
  import { setMuted, tada, tick, whoosh } from './sound.js'
  import { MAX_SPEED, indexAtPointer, randomSpin, speedAt, travelAt } from './spin.js'
  import { load, save } from './storage.js'

  const DEFAULT_NAMES = 'Alice\nBob\nChloé\nDavid\nEmma\nFarid\nGaëlle\nHugo'
  const WOBBLE_CHANCE = 1 / 5 // wheel distortion
  const RINGS_CHANCE = 2 / 5 // wavy rings; the rest of the time, no wave effect

  // Persisted settings. A list emptied on purpose ('') is kept as is.
  let text = $state(load('participants', DEFAULT_NAMES))
  let muted = $state(load('muted', '0') === '1')
  $effect(() => save('participants', text))
  $effect(() => {
    setMuted(muted)
    save('muted', muted ? '1' : '0')
  })

  let rotation = $state(0) // degrees, clockwise
  let spinning = $state(false)
  let winnerIndex = $state(null)
  let force = $state(null) // force of the last spin, between 0 and 1
  let wobbling = $state(false)
  let speed = $state(0) // wheel speed during a spin, between 0 and 1
  let spinTime = $state(0) // seconds since launch
  let panelOpen = $state(false) // participants panel, mobile only
  let effects
  let rim = $state()

  let names = $derived(
    text
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean),
  )
  let winner = $derived(winnerIndex === null ? null : (names[winnerIndex] ?? null))

  // Fisher-Yates shuffle of the names (empty lines are dropped).
  function shuffle() {
    const list = [...names]
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
    text = list.join('\n')
    winnerIndex = null
  }

  function reset() {
    rotation = 0
    winnerIndex = null
    force = null
  }

  function spin() {
    if (spinning || names.length === 0) return
    spinning = true
    winnerIndex = null
    panelOpen = false // on mobile, close the panel so the wheel is visible

    const current = randomSpin()
    const count = names.length // the list cannot change while spinning
    const slice = 360 / count
    force = current.force
    const from = rotation % 360
    const start = performance.now()
    let lastSlice = Math.floor(from / slice)
    whoosh()
    // 1 time in 5: wheel wobble (SVG filter); 2 in 5: wavy rings (PixiJS);
    // 2 in 5: no wave effect.
    const roll = Math.random()
    wobbling = roll < WOBBLE_CHANCE && !reducedMotion()
    effects?.spinStart({ rings: roll >= WOBBLE_CHANCE && roll < WOBBLE_CHANCE + RINGS_CHANCE })

    const frame = (now) => {
      const t = (now - start) / 1000
      rotation = from + travelAt(current, t)
      // One "click" each time a slice boundary passes under the pointer.
      const currentSlice = Math.floor(rotation / slice)
      if (currentSlice !== lastSlice) {
        lastSlice = currentSlice
        if (count > 1) tick()
      }

      spinTime = t
      speed = speedAt(current, t) / MAX_SPEED
      effects?.spinSpeed(speed)

      if (t < current.duration) {
        requestAnimationFrame(frame)
      } else {
        spinning = false
        wobbling = false
        effects?.spinEnd()
        winnerIndex = indexAtPointer(rotation, count)
        effects?.celebrate()
        tada()
      }
    }
    requestAnimationFrame(frame)
  }
</script>

<main>
  <section class="stage">
    <Wheel {names} {rotation} {winnerIndex} wobble={wobbling} {speed} time={spinTime} bind:rim />
    <Effects bind:this={effects} target={rim} />
    {#if winner}
      {#key winnerIndex}
        <WinnerBanner {winner} />
      {/key}
    {/if}
    <button class="spin-fab" onclick={spin} disabled={spinning || names.length === 0}>
      {spinning ? 'Spinning…' : 'Spin the wheel'}
    </button>
  </section>

  <ParticipantsPanel
    bind:text
    bind:open={panelOpen}
    count={names.length}
    {spinning}
    canReset={rotation !== 0 || winnerIndex !== null}
    {muted}
    {force}
    {winner}
    onspin={spin}
    onshuffle={shuffle}
    onreset={reset}
    ontogglemute={() => (muted = !muted)}
    onedit={() => (winnerIndex = null)}
  />
</main>

<style>
  main {
    display: grid;
    grid-template-columns: 1fr 360px;
    height: 100vh;
  }

  .stage {
    container-type: size;
    position: relative;
    /* The winner banner scales up as it fades out: keep it from adding page scrollbars. */
    overflow: hidden;
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: 0;
    padding: 16px;
  }

  /* Mobile only */
  .spin-fab {
    display: none;
  }

  /* Mobile: the wheel fills the screen, with a floating spin button. */
  @media (max-width: 720px) {
    main {
      grid-template-columns: 1fr;
      height: 100dvh;
    }

    .stage {
      padding-bottom: 88px;
    }

    .spin-fab {
      display: block;
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 16px;
    }
  }
</style>
