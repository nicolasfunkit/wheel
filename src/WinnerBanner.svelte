<script>
  // Winner's name in large type over the wheel. Sized with container query units, so the
  // parent must be a size container.
  let { winner } = $props()

  let letters = $derived(Array.from(winner))
</script>

<div class="banner" style:--len={Math.max(letters.length, 4)} aria-hidden="true">
  <div>
    {#each letters as letter, i (i)}
      <span style:--i={i}>{letter === ' ' ? ' ' : letter}</span>
    {/each}
  </div>
  <div class="wins" style:--i={letters.length + 2}>wins!</div>
</div>

<style>
  /* Fades out on its own after 5 s. */
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
</style>
