# The Wheel

Spin a wheel to pick a random participant. Built with Vite, Svelte 5 and PixiJS; installable as a PWA.

**Live:** https://nicolasfunkit.github.io/wheel/

## Features

- One participant per line; the list is saved in the browser (`localStorage`) and restored on the next visit.
- Fair spins: a random launch force and closed-form friction physics give every slice the same odds, whatever the frame rate.
- Particle effects (PixiJS), a demoscene-style wobble and synthesized sounds (Web Audio API, no audio files). Effects are skipped when the system asks for reduced motion.
- Works offline once loaded, and can be installed as an app.

## Development

```bash
npm install
npm run dev      # dev server
npm run build    # production build in dist/
npm run preview  # serve the production build locally
npm run lint     # ESLint (JavaScript and Svelte)
npm test         # unit tests, including the fairness of the draw
```

## Project layout

| File | Role |
| --- | --- |
| `src/App.svelte` | State, spin loop, layout |
| `src/Wheel.svelte` | SVG wheel and wobble filter |
| `src/WinnerBanner.svelte` | Animated winner name |
| `src/ParticipantsPanel.svelte` | Participants list, actions, force gauge (drawer on mobile) |
| `src/Effects.svelte` | PixiJS particle effects (spin effects, confetti, fireworks) |
| `src/spin.js` | Spin physics and winner selection (pure functions) |
| `src/sound.js` | Synthesized sounds |
| `src/storage.js` | Guarded `localStorage` access |
| `test/spin.test.js` | Fairness and physics tests |

## Deployment

Every push to `main` is linted, tested, built and published to GitHub Pages by `.github/workflows/deploy.yml`.
