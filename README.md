# Beverly Hills Erbil — Immersive Aerial Experience

A single-screen, fully immersive landing experience for the **Beverly Hills Erbil** masterplan,
structured like the great aerial masterplan explorers: one moody top-down 3D view of the city,
drifting clouds, centered serif typography, and an interactive map behind one button.

The entire 3D city is **procedurally generated** in three.js (no model files) and follows the
real project layout: the curved highway hugging the west edge, a fan of white villa crescents
along it with the pool gardens inside, the sculpted twin towers + terracotta tower at the
centre, the grand east lawn with its row of emerald glass towers, the gated circular entrance,
and the hedge "BEVERLY HILLS ERBIL" lettering.

## Run it

Any static server works (ES modules require http://, not file://):

```
npx serve -l 8765 .
# then open http://localhost:8765
```

## Experience map

| Element | Behaviour |
|---|---|
| Preloader | Monogram + bilingual brand, live progress % |
| Hero | Near-top-down aerial with slow drift + mouse parallax, drifting volumetric clouds, dark cinematic grade, centered type, EXPLORE THE MAP |
| Explore mode | Free orbit/zoom; hover highlights districts with a labeled cursor; click (or the district rail / pulsing map labels) flies the camera in and opens a fact panel |
| Inquire | Top-right INQUIRE (and every Register Interest CTA) opens a modal form over the live map |
| Site details | Bottom-right SITE DETAILS opens a right-hand drawer with the masterplan facts |
| Sound | EXPLORE starts a synthesized wind ambience (Web Audio, no files); START WITHOUT AUDIO skips it; top-left waveform toggles it |

## Stack

- **three.js 0.160** (CDN import map) — procedural world, instanced villas/trees, cloud sprites, raycast district zones, OrbitControls
- **GSAP 3.12** — camera flights, intro choreography, UI transitions, micro-interactions
- Custom cursor, magnetic buttons, grain, foreground haze — vanilla JS/CSS
- Fonts: Cormorant Garamond (display), Marcellus (wordmark), Manrope (UI)

## Files

```
index.html       structure & content (hero, explore UI, drawer, modal)
css/style.css    dark design system (deep green / cream / gold)
js/scene.js      the procedural 3D world (exports World + DISTRICTS data)
js/main.js       experience layer (states, cursor, modal, drawer, ambience)
```

## Customising

- **District facts / copy** — `DISTRICTS` at the top of `js/scene.js`; rail, labels and panel build themselves from it.
- **Camera poses** — `HERO_POS/HERO_TGT` and `EXPLORE_POS/EXPLORE_TGT` in `js/scene.js`, plus per-district `view` entries.
- **City layout** — the `_build*()` methods in `scene.js` (villa fan geometry, tower positions, lawn, clouds…).
- **Mood** — `toneMappingExposure`, fog density and the `.grade`/`.scrim` overlays in `css/style.css`.

All figures (214 villas, areas, distances) are concept placeholders — replace with project data before publishing.
