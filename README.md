# ALI STUDIO — Vibrant Poster & 3D Design Generator

A pure HTML/CSS/JavaScript SVG generator, upgraded from the supplied version.

## Included
- 1–12 designs per collection
- Vibrant gradient themes with automatic per-design color variation
- 7 design families: Vibrant Mix, Liquid Flow, Glass Orbs, Geometric Prism, Organic Forms, Editorial Waves, Minimal Geometry
- Flat mode or optional **3D Depth** mode
- SVG lighting, blur, gradient and shadow effects; artwork remains vector-based
- Portrait / square / landscape formats
- Standard / Large / XL SVG output
- Per-design SVG download and copy SVG markup
- Combined collection SVG download
- Save current settings as JSON
- Seeded repeatable generation
- Responsive dark editor UI
- No backend required; everything runs in-browser

## Run locally
Open `index.html` directly in a modern browser, or use a static server:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Files
- `index.html` — application structure and controls
- `styles.css` — redesigned vibrant editor UI
- `app.js` — dynamic SVG generation engine and 3D/flat rendering
