<script>
  // Side panel: participants list, actions, launch force gauge and result.
  // On mobile it becomes a drawer, hidden by default and opened with a toggle button.
  let {
    text = $bindable(),
    open = $bindable(false),
    count,
    spinning,
    canReset,
    muted,
    force, // force of the last spin, between 0 and 1 (null before the first spin)
    winner,
    onspin,
    onshuffle,
    onreset,
    ontogglemute,
    onedit,
  } = $props()
</script>

<button
  class="panel-toggle"
  onclick={() => (open = !open)}
  aria-label={open ? 'Hide participants' : 'Show participants'}
  aria-expanded={open}
>
  {open ? '✕' : '☰'}
</button>
{#if open}
  <button class="backdrop" onclick={() => (open = false)} aria-label="Hide participants"></button>
{/if}

<aside class:open>
  <div class="toolbar">
    <label for="names">Participants <span>({count})</span></label>
    <button class="tool" onclick={onshuffle} disabled={spinning || count < 2}>🔀 Shuffle</button>
    <button class="tool" onclick={onreset} disabled={spinning || !canReset}>↺ Reset</button>
    <button
      class="tool"
      onclick={ontogglemute}
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
    oninput={onedit}
    disabled={spinning}
    placeholder="One name per line"
    spellcheck="false"
  ></textarea>
  <button onclick={onspin} disabled={spinning || count === 0}>
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

<style>
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

  /* Mobile only */
  .panel-toggle,
  .backdrop {
    display: none;
  }

  /* Mobile: the panel becomes a drawer hidden by default. */
  @media (max-width: 720px) {
    .panel-toggle {
      display: block;
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 3;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 1px solid #343a48;
      background: #1a1e27;
      color: inherit;
    }

    .backdrop {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 1;
      padding: 0;
      border-radius: 0;
      background: rgb(0 0 0 / 0.55);
    }

    aside {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 2;
      width: min(360px, 88vw);
      padding-top: 68px;
      box-sizing: border-box;
      transform: translateX(100%);
      visibility: hidden;
      transition:
        transform 0.25s ease,
        visibility 0s 0.25s;
    }

    aside.open {
      transform: none;
      visibility: visible;
      transition: transform 0.25s ease;
      box-shadow: -8px 0 24px rgb(0 0 0 / 0.5);
    }
  }
</style>
