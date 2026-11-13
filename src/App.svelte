<script>
  import Effects from './Effects.svelte'

  const R = 96 // rayon de la roue dans le viewBox (-100..100)
  const MAX_SPEED = 1600 // deg/s
  const FRICTION = 0.9 // décroissance exponentielle de la vitesse (1/s)
  const MIN_SPEED = 3 // deg/s : en dessous, la roue est considérée arrêtée

  let text = $state('Alice\nBob\nChloé\nDavid\nEmma\nFarid\nGaëlle\nHugo')
  let rotation = $state(0) // degrés, sens horaire
  let spinning = $state(false)
  let winnerIndex = $state(null)
  let effects
  let rim = $state()

  let names = $derived(
    text
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean),
  )
  let winner = $derived(winnerIndex === null ? null : (names[winnerIndex] ?? null))
  let slice = $derived(360 / Math.max(names.length, 1))
  let fontSize = $derived(Math.max(3.5, Math.min(9, 150 / Math.max(names.length, 1))))

  // Angle 0 = en haut, sens horaire.
  const point = (deg, r = R) => {
    const rad = (deg * Math.PI) / 180
    return `${(r * Math.sin(rad)).toFixed(3)},${(-r * Math.cos(rad)).toFixed(3)}`
  }
  const slicePath = (i) =>
    `M0,0 L${point(i * slice)} A${R},${R} 0 ${slice > 180 ? 1 : 0} 1 ${point((i + 1) * slice)} Z`
  const color = (i) => `hsl(${Math.round((i * 360) / names.length)} 75% ${i % 2 ? 52 : 60}%)`
  const label = (name) => (name.length > 18 ? name.slice(0, 17) + '…' : name)

  // Index du segment sous le pointeur (fixe, en haut).
  const indexAtPointer = () => {
    const local = (360 - (rotation % 360)) % 360
    return Math.floor(local / slice) % names.length
  }

  // Mélange de Fisher-Yates sur les prénoms (les lignes vides sont retirées).
  function shuffle() {
    const list = [...names]
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
    text = list.join('\n')
    winnerIndex = null
  }

  function spin() {
    if (spinning || names.length === 0) return
    spinning = true
    winnerIndex = null

    let speed = 700 + Math.random() * (MAX_SPEED - 700) // deg/s, vitesse initiale aléatoire
    let last = performance.now()
    effects?.spinStart()

    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      rotation += speed * dt
      speed *= Math.exp(-FRICTION * dt)
      effects?.spinSpeed(speed / MAX_SPEED)

      if (speed > MIN_SPEED && names.length > 0) {
        requestAnimationFrame(frame)
      } else {
        spinning = false
        effects?.spinEnd()
        if (names.length) {
          winnerIndex = indexAtPointer()
          effects?.celebrate()
        }
      }
    }
    requestAnimationFrame(frame)
  }
</script>

<main>
  <section class="stage">
    <svg viewBox="-104 -108 208 212" role="img" aria-label="Picker wheel">
      <g transform="rotate({rotation})">
        {#if names.length === 0}
          <circle r={R} fill="#2a2f3a" />
        {:else if names.length === 1}
          <circle r={R} fill={color(0)} />
        {:else}
          {#each names as _, i}
            <path
              d={slicePath(i)}
              fill={color(i)}
              stroke="#11141a"
              stroke-width="0.4"
              opacity={winnerIndex !== null && winnerIndex !== i ? 0.3 : 1}
            />
          {/each}
        {/if}
        {#each names as name, i}
          <text
            transform="rotate({(i + 0.5) * slice - 90})"
            x={R - 5}
            text-anchor="end"
            dominant-baseline="central"
            font-size={fontSize}
          >
            {label(name)}
          </text>
        {/each}
      </g>
      <circle bind:this={rim} r={R} fill="none" stroke="#f5f5f5" stroke-width="1.5" />
      <circle r="7" fill="#f5f5f5" />
      <path d="M-6,-107 L6,-107 L0,-92 Z" fill="#f5f5f5" stroke="#11141a" stroke-width="0.6" />
    </svg>
    <Effects bind:this={effects} target={rim} />
  </section>

  <aside>
    <div class="toolbar">
      <label for="names">Participants <span>({names.length})</span></label>
      <button class="tool" onclick={shuffle} disabled={spinning || names.length < 2}>
        🔀 Shuffle
      </button>
    </div>
    <textarea
      id="names"
      bind:value={text}
      oninput={() => (winnerIndex = null)}
      disabled={spinning}
      placeholder="One name per line"
      spellcheck="false"
    ></textarea>
    <button onclick={spin} disabled={spinning || names.length === 0}>
      {spinning ? 'Spinning…' : 'Spin the wheel'}
    </button>
    <p class="result" aria-live="polite">
      {#if winner}🎉 <strong>{winner}</strong>{/if}
    </p>
  </aside>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #11141a;
    color: #f5f5f5;
    font-family: system-ui, sans-serif;
  }

  main {
    display: grid;
    grid-template-columns: 1fr 320px;
    height: 100vh;
  }

  .stage {
    position: relative;
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: 0;
    padding: 16px;
  }

  svg {
    width: 100%;
    height: 100%;
    max-height: calc(100vh - 32px);
  }

  path {
    transition: opacity 0.4s;
  }

  text {
    fill: #11141a;
    font-weight: 600;
    user-select: none;
  }

  aside {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: #1a1e27;
    min-height: 0;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .toolbar label {
    flex: 1;
  }

  button.tool {
    padding: 6px 10px;
    border: 1px solid #343a48;
    background: transparent;
    color: inherit;
    font-size: 0.9rem;
    font-weight: 500;
  }

  button.tool:hover:not(:disabled) {
    background: #252a36;
  }

  label {
    font-weight: 600;
  }

  label span {
    opacity: 0.6;
    font-weight: 400;
  }

  textarea {
    flex: 1;
    resize: none;
    padding: 12px;
    border: 1px solid #343a48;
    border-radius: 8px;
    background: #11141a;
    color: inherit;
    font: inherit;
    line-height: 1.5;
  }

  button {
    padding: 14px;
    border: 0;
    border-radius: 8px;
    background: #ffb703;
    color: #11141a;
    font: inherit;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .result {
    min-height: 2.5rem;
    margin: 0;
    font-size: 1.6rem;
    text-align: center;
    overflow-wrap: anywhere;
  }

  @media (max-width: 720px) {
    main {
      grid-template-columns: 1fr;
      grid-template-rows: 55vh 1fr;
    }
  }
</style>
