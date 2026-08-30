# ALI STUDIO — SVG Design Generator

A pure HTML/CSS/JavaScript abstract SVG poster generator inspired by the supplied UI screenshot.

## Files
- `index.html` — application structure
- `styles.css` — dark editor UI and responsive layout
- `app.js` — SVG generation engine and controls

## Run
Open `index.html` directly in a modern browser.

For local development, a simple static server is recommended:
```bash
python -m http.server 8080
```
Then open:
`http://localhost:8080`

## Features
- 1–8 posters
- Retro + Bubble
- Watercolor Bubbles
- Watercolor Blobs
- Watercolor Fluid
- Shapes Watercolor
- Organic Shapes Watercolor
- Circles Watercolor
- Splashes Watercolor
- Washes Watercolor
- Marbling Watercolor
- Swirls Watercolor
- Waves Watercolor
- Dots Watercolor
- Confetti Watercolor
- Galaxy Watercolor
- Botanical Watercolor
- Abstract Shapes
- Soft Blobs
- Mandala
- Retro Waves
- Minimal Circles
- Geometric
- Live controls for density, frequency, shape size, thickness, amplitude, phase and chaos
- Seeded generation for repeatable designs
- Portrait / square / landscape formats
- Standard / Large / XL SVG output
- Background and stroke colors
- Per-poster SVG download
- Download all SVGs
- Save settings as JSON
- Copy SVG markup
- No backend required; everything runs in-browser

## Extending it
Add more generators as functions in `app.js` and add an option in the `#designMode` select.

Important: this is an original implementation based on the visual behavior you described/supplied, not a copy of proprietary source code from another website.


## Combined Illustrator artboard

**Download All as One SVG** creates a single SVG file containing every generated poster/design on one artboard. Each poster is placed in its own SVG `<g>` group, so Illustrator can open the single file while keeping the shapes editable.

The artboard column count and gap can be changed from the sidebar.

Backgrounds are now automatically built as vivid multi-stop gradients from the selected background color and the active design palette, with subtle glow overlays.
