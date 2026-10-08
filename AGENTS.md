# AGENTS.md

Single-page [p5.js](https://p5js.org/) sketch. No build system, package manager, tests, lint, or CI — just static files. Do not look for `package.json`/tooling or add any unless asked.

## Files
- `index.html` — loads p5 v2.3.4 and p5.sound v0.4.1 from the jsDelivr CDN, then `sketch.js`. Un-deferred, so load order matters (p5 core → p5.sound → sketch).
- `sketch.js` — all sketch logic, in p5 **global mode** (`setup`, `draw`, `createCanvas`, `circle`, etc. are top-level globals; this is not instance mode).

## p5.sound (non-obvious)
- p5 2.x does **not** ship sound; p5.sound is a separate package (`p5.sound@0.4.1`) and a Tone.js rewrite, not the legacy p5.js-sound library. API differs from old tutorials: `new p5.Oscillator()`, `new p5.Envelope()`, `env.setADSR(a,d,s,r)`, `env.play()`, global `userStartAudio()`. There is no `setRange` / `timeFromNow` on `amp()`.
- Browsers block audio until a user gesture — audio nodes are created lazily on the first `mousePressed` (guarded by `audioLista`), so `sonar()` is a no-op before that. Do **not** create/start the oscillator in `setup()`.
- **Firefox has no `AudioParam.cancelAndHoldAtTime`**, but p5.sound 0.4.1 (Tone.js) calls it on frequency/envelope changes → `TypeError`. The polyfill at the top of `sketch.js` fixes it. A fix exists upstream but is **not** in the released 0.4.1 build on the CDN; don't remove the polyfill until the CDN build includes it.

## Run / preview
Load `index.html` in a browser. For a local server (reliable for CDN + script loading):

```
python3 -m http.server
```

There is no dev server, watch, or build step.

## Gotchas
- p5 is fetched from a CDN, so previewing requires network access.
- `createCanvas()` resets the color mode to RGB, so `colorMode(HSB, ...)` must be called **after** `createCanvas()` in `setup()`.
- p5 2.x has **no `star()` primitive** (it existed in 1.x). `sketch.js` builds stars with `poligonoEstrella()` (beginShape/vertex). Don't reach for other removed 1.x helpers without checking.
- Particle emission is continuous from the cursor (rate-based, `EMISION_POR_SEG`), not tied to mouse-move events. Particles are fully visible for 10 s then fade over 2 s (`VIDA_PARTICULA` + `DESVANECIDO`), timed with `millis()` — don't switch to `frameCount`.
- The ball reaches the top edge via `impulsoFuerte()`, which derives the needed speed from `height` (not a fixed constant), so it works at any window size.
- Canvas is sized once with `createCanvas(windowWidth, windowHeight)` in `setup()`; there is no `windowResized()` handler, so it does not adapt on resize.
- Comments and UI text are in Spanish; keep that convention when editing.
- Default branch is `main`, remote `origin` = `github.com/noelia2026/pelota-que-rebota`.
