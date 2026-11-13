<script>
  import { onMount } from 'svelte'
  import Effects from './Effects.svelte'
  import { setMuted, tada, tick, whoosh } from './sound.js'
  import { MAX_SPEED, indexAtPointer, randomSpin, speedAt, travelAt } from './spin.js'

  const R = 96 // rayon de la roue dans le viewBox (-100..100)
  let text = $state('Alice\nBob\nChloé\nDavid\nEmma\nFarid\nGaëlle\nHugo')
  let rotation = $state(0) // degrés, sens horaire
  let spinning = $state(false)
  let winnerIndex = $state(null)
  // Effet « wobble » façon démo : chaque ligne horizontale de la roue est décalée
  // selon une sinusoïde qui défile verticalement (filtre SVG de déplacement).
  const WOBBLE_CHANCE = 1 / 5 // déformation de la roue
  const RINGS_CHANCE = 2 / 5 // anneaux ondulés ; le reste du temps, aucune ondulation
  const WOBBLE_PERIOD = 46 // hauteur d'une ondulation, en unités du viewBox
  const WOBBLE_MAX = 16 // décalage crête à crête à pleine vitesse
  const WOBBLE_SCROLL = 55 // défilement vertical, unités/s
  let wobbleMap = $state('') // image de déplacement : rouge = sinusoïde verticale
  let wobbling = $state(false)
  let wobbleAmp = $state(0)
  let wobbleShift = $state(0)

  onMount(() => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = size
    const ctx = canvas.getContext('2d')
    for (let y = 0; y < size; y++) {
      const red = Math.round(127.5 + 127.5 * Math.sin((y / size) * Math.PI * 2))
      ctx.fillStyle = `rgb(${red} 128 128)`
      ctx.fillRect(0, y, 1, 1)
    }
    wobbleMap = canvas.toDataURL()
  })

  function initialMuted() {
    try {
      return localStorage.getItem('muted') === '1'
    } catch {
      return false
    }
  }
  let muted = $state(initialMuted())
  setMuted(initialMuted())

  function toggleMuted() {
    muted = !muted
    setMuted(muted)
    try {
      localStorage.setItem('muted', muted ? '1' : '0')
    } catch {}
  }

  let force = $state(null) // force du dernier lancer, entre 0 et 1
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

  function reset() {
    rotation = 0
    winnerIndex = null
    force = null
  }

  function spin() {
    if (spinning || names.length === 0) return
    spinning = true
    winnerIndex = null

    const current = randomSpin()
    force = current.force
    const from = rotation % 360
    const start = performance.now()
    let lastSlice = Math.floor(from / slice)
    whoosh()
    // 1 fois sur 5 : wobble de la roue (filtre SVG) ; 2 fois sur 5 : anneaux ondulés (PixiJS) ;
    // 2 fois sur 5 : aucune ondulation.
    const roll = Math.random()
    wobbling =
      roll < WOBBLE_CHANCE && !!wobbleMap && !matchMedia('(prefers-reduced-motion: reduce)').matches
    effects?.spinStart({ rings: roll >= WOBBLE_CHANCE && roll < WOBBLE_CHANCE + RINGS_CHANCE })

    const frame = (now) => {
      const t = (now - start) / 1000
      rotation = from + travelAt(current, t)
      // Un « clac » à chaque séparation de segments qui passe sous le pointeur.
      const currentSlice = Math.floor(rotation / slice)
      if (currentSlice !== lastSlice) {
        lastSlice = currentSlice
        if (names.length > 1) tick()
      }

      const intensity = speedAt(current, t) / MAX_SPEED
      effects?.spinSpeed(intensity)
      // racine carrée : l'ondulation reste visible plus longtemps pendant le ralentissement
      wobbleAmp = WOBBLE_MAX * Math.sqrt(intensity) * Math.min(1, t / 0.5)
      wobbleShift = (t * WOBBLE_SCROLL) % WOBBLE_PERIOD

      if (t < current.duration) {
        requestAnimationFrame(frame)
      } else {
        spinning = false
        wobbling = false
        effects?.spinEnd()
        if (names.length) {
          winnerIndex = indexAtPointer(rotation, names.length)
          effects?.celebrate()
          tada()
        }
      }
    }
    requestAnimationFrame(frame)
  }
</script>

<main>
  <section class="stage">
    <svg viewBox="-104 -108 208 212" role="img" aria-label="Picker wheel">
      <defs>
        <filter
          id="wobble"
          filterUnits="userSpaceOnUse"
          x="-116"
          y="-116"
          width="232"
          height="232"
          color-interpolation-filters="sRGB"
        >
          <feImage
            href={wobbleMap}
            x="-116"
            y={-116 + wobbleShift}
            width="232"
            height={WOBBLE_PERIOD}
            preserveAspectRatio="none"
            result="stripe"
          />
          <feTile in="stripe" result="map" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale={wobbleAmp}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g filter={wobbling ? 'url(#wobble)' : undefined}>
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
      </g>
      <path d="M-6,-107 L6,-107 L0,-92 Z" fill="#f5f5f5" stroke="#11141a" stroke-width="0.6" />
    </svg>
    <Effects bind:this={effects} target={rim} />
    {#if winner}
      {#key winnerIndex}
        <div class="banner" style:--len={Math.max(Array.from(winner).length, 4)} aria-hidden="true">
          <div>
            {#each Array.from(winner) as letter, i}
              <span style:--i={i}>{letter === ' ' ? '\u00a0' : letter}</span>
            {/each}
          </div>
          <div class="wins" style:--i={Array.from(winner).length + 2}>wins!</div>
        </div>
      {/key}
    {/if}
  </section>

  <aside>
    <div class="toolbar">
      <label for="names">Participants <span>({names.length})</span></label>
      <button class="tool" onclick={shuffle} disabled={spinning || names.length < 2}>
        🔀 Shuffle
      </button>
      <button class="tool" onclick={reset} disabled={spinning || (rotation === 0 && winnerIndex === null)}>
        ↺ Reset
      </button>
      <button
        class="tool"
        onclick={toggleMuted}
        title={muted ? 'Unmute' : 'Mute'}
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
      >
        {muted ? '🔇' : '🔊'}
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
    <div class="force" class:idle={force === null}>
      <span>Launch force</span>
      <div class="gauge"><div style:width="{(force ?? 0) * 100}%"></div></div>
      <span class="value">{force === null ? '–' : Math.round(force * 100) + '%'}</span>
    </div>
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
    grid-template-columns: 1fr 360px;
    height: 100vh;
  }

  .stage {
    container-type: size;
    position: relative;
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: 0;
    padding: 16px;
  }

  svg {
    overflow: visible;
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
    white-space: nowrap;
  }

  button.tool {
    padding: 6px 8px;
    white-space: nowrap;
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

  /* Nom du gagnant en grand par-dessus la roue : s'efface tout seul au bout de 5 s. */
  .banner {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    line-height: 1.05;
    pointer-events: none;
    font-size: min(24cqh, calc(125cqw / var(--len)));
    font-weight: 900;
    white-space: nowrap;
    animation: banner-out 0.7s ease-in 5s forwards;
  }

  .banner span,
  .banner .wins {
    display: inline-block;
    color: hsl(calc(45 + var(--i) * 37) 100% 68%);
    -webkit-text-stroke: 0.09em #11141a;
    paint-order: stroke fill;
    text-shadow:
      0 0.05em 0 #11141a,
      0 0 0.35em rgb(255 183 3 / 0.9);
    animation:
      letter-in 0.65s cubic-bezier(0.2, 1.7, 0.4, 1) both,
      letter-wave 1.1s ease-in-out infinite;
    animation-delay:
      calc(var(--i) * 70ms),
      calc(var(--i) * 70ms + 0.65s);
  }

  .banner .wins {
    font-size: 0.5em;
    color: #fff;
  }

  @keyframes letter-in {
    from {
      opacity: 0;
      transform: translateY(-1em) scale(0.1) rotate(-30deg);
    }
  }

  @keyframes letter-wave {
    50% {
      transform: translateY(-0.14em) rotate(3deg);
    }
  }

  @keyframes banner-out {
    to {
      opacity: 0;
      transform: scale(1.6);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .banner span,
    .banner .wins {
      animation: none;
    }
  }

  .force {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
  }

  .force.idle {
    opacity: 0.5;
  }

  .gauge {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: #11141a;
    overflow: hidden;
  }

  .gauge div {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #4cc9f0, #ffb703, #ef476f);
    background-size: 276px 100%;
    transition: width 0.3s ease-out;
  }

  .force .value {
    min-width: 3ch;
    text-align: right;
    font-variant-numeric: tabular-nums;
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
