<script>
  import { onMount } from 'svelte'

  const R = 96 // wheel radius in the viewBox (-100..100)
  // Demoscene-style "wobble": each horizontal line of the wheel is shifted along a sine wave
  // that scrolls vertically (SVG displacement filter).
  const WOBBLE_PERIOD = 46 // height of one wave, in viewBox units
  const WOBBLE_MAX = 16 // peak-to-peak shift at full speed
  const WOBBLE_SCROLL = 55 // vertical scroll, units/s

  // `rotation`: degrees, clockwise. `wobble`: whether the current spin distorts the wheel,
  // driven by `speed` (0..1) and `time` (seconds since launch). `rim`: the rim element,
  // exposed so the effects can be aligned on the wheel.
  let {
    names,
    rotation,
    winnerIndex = null,
    wobble = false,
    speed = 0,
    time = 0,
    rim = $bindable(),
  } = $props()

  let wobbleMap = $state('') // displacement map: red channel = vertical sine wave

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

  // square root: the wobble stays visible longer while the wheel slows down
  let wobbleAmp = $derived(WOBBLE_MAX * Math.sqrt(speed) * Math.min(1, time / 0.5))
  let wobbleShift = $derived((time * WOBBLE_SCROLL) % WOBBLE_PERIOD)

  let slice = $derived(360 / Math.max(names.length, 1))
  let fontSize = $derived(Math.max(3.5, Math.min(9, 150 / Math.max(names.length, 1))))

  // Angle 0 = top, clockwise.
  const point = (deg, r = R) => {
    const rad = (deg * Math.PI) / 180
    return `${(r * Math.sin(rad)).toFixed(3)},${(-r * Math.cos(rad)).toFixed(3)}`
  }
  const slicePath = (i) =>
    `M0,0 L${point(i * slice)} A${R},${R} 0 ${slice > 180 ? 1 : 0} 1 ${point((i + 1) * slice)} Z`
  const color = (i) => `hsl(${Math.round((i * 360) / names.length)} 75% ${i % 2 ? 52 : 60}%)`
  // Truncate by code points so an emoji is never cut in half.
  const label = (name) => {
    const chars = Array.from(name)
    return chars.length > 18 ? chars.slice(0, 17).join('') + '…' : name
  }
</script>

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
  <g filter={wobble && wobbleMap ? 'url(#wobble)' : undefined}>
    <g transform="rotate({rotation})">
      {#if names.length === 0}
        <circle r={R} fill="#2a2f3a" />
      {:else if names.length === 1}
        <circle r={R} fill={color(0)} />
      {:else}
        {#each names as _name, i (i)}
          <path
            d={slicePath(i)}
            fill={color(i)}
            stroke="#11141a"
            stroke-width="0.4"
            opacity={winnerIndex !== null && winnerIndex !== i ? 0.3 : 1}
          />
        {/each}
      {/if}
      {#each names as name, i (i)}
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

<style>
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

  @media (max-width: 720px) {
    svg {
      /* screen height minus the stage padding (16px top, 88px bottom) */
      height: calc(100dvh - 104px);
      max-height: none;
    }
  }
</style>
