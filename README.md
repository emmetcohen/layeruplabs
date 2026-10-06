# Emmet — portfolio

A static "drafting table / blueprint" portfolio. Plain HTML, CSS and vanilla JS — **no build step, no npm**.
The only external code is Google Fonts and (only if you add a 3D model) `<model-viewer>` pinned to `3.5.0` on jsDelivr.

## Preview locally

The site fetches `projects.json`, so it must be served over HTTP (double-clicking `index.html` won't work):

```bash
cd emmet-portfolio
python3 -m http.server 8000
# open http://localhost:8000
```

## Where things live

| Path | What |
|---|---|
| `index.html`, `work.html`, `about.html` | Pages (home/about text lives here) |
| `category.html?c=ID`, `project.html?p=ID` | Templates filled from JSON — one page per category / project |
| `projects.json` | **All categories and projects** |
| `site.json` | Email, Layer Up Labs / Etsy / social links |
| `assets/images/` | Your real images (same filename as the placeholder) |
| `assets/placeholders/` | Blueprint placeholder SVGs (auto-used when a real image is missing) |
| `assets/models/model.glb` | Drop-in 3D model for the SD40-2 viewer |
| `assets/resume.pdf` | Replace with your résumé |
| `css/style.css` | All styling; palette is at the top |
| `ASSETS_NEEDED.md` | Every placeholder, size, and the page it appears on |

Placeholders in text look like `[ONE-LINE INTRO]` and are highlighted orange. Search the repo for `[` to find them.

## Swap a placeholder image

Drop a file with the **same name** into `assets/images/` (see `ASSETS_NEEDED.md`). The site tries the real file first and falls back to the placeholder SVG. No code changes.
- Hero portrait: `portrait.jpg` (real) and `portrait-wire.jpg` (wireframe). If you only supply `portrait.jpg`, a cyan edge-detect wireframe is generated automatically.
- A project tile with a `"wire"` image swaps wireframe → finished render on hover. Delete the `"wire"` line to get an automatic blueprint-tint effect instead.
- 3D model: add `assets/models/model.glb`; until then the page shows "Model coming soon".

## Add a project

Add an object to `projects` in `projects.json` (copy an existing one):

```json
{
  "id": "my-project",            // unique, URL-safe; page is project.html?p=my-project
  "title": "My Project",
  "category": "fabrication",     // modeling | optics | fabrication | illustration | lab-notes | team
  "group": "people",             // optics only: people | landscapes | sports
  "date": "2025-03",             // YYYY-MM
  "tools": ["Blender", "FDM printing"],
  "summary": "One line for the tile.",
  "description": "2–3 sentences on the idea.",
  "tolerances": { "wentWrong": "What failed.", "learned": "What I learned." },
  "cover": "assets/images/my-project-cover.jpg",
  "coverAlt": "Describe the cover photo",
  "wire": "assets/images/my-project-wire.jpg",   // optional
  "gallery": [ { "src": "assets/images/my-project-1.jpg", "alt": "Describe it" } ],
  "featured": true,              // optional: show on the home page (first 6)
  "model": "assets/models/model.glb",            // optional: 3D viewer
  "links": [ { "label": "Shop", "url": "https://..." } ]   // optional
}
```

Optional: run `python3 tools/make_placeholders.py` to generate placeholders for the new files and refresh `ASSETS_NEEDED.md`.
Departments (names, blurbs, buttons like "Commission a piece") are in the `categories` array of the same file.

## Change colors

Edit the variables at the top of `css/style.css` (`--bg`, `--cyan`, `--accent`, …). Orange (`--accent`) is used only for buttons and highlights.

## Publish on GitHub Pages

1. Create an empty repo on github.com (e.g. `portfolio`), no README/license.
2. In this folder:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/portfolio.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save**.
4. After a minute the site is live at `https://YOUR-USERNAME.github.io/portfolio/`.

All paths are relative, so it works from that subpath or a custom domain root. To test a subpath locally:
```bash
mkdir /tmp/sub && ln -s "$PWD" /tmp/sub/portfolio && cd /tmp/sub && python3 -m http.server 8000
# open http://localhost:8000/portfolio/
```

## Behaviour notes
- Intro animation plays once per browser session; skip with the button, Esc, Enter or a click. Skipped for `prefers-reduced-motion`.
- Crosshair cursor shows on desktop (fine pointer) only. Z-axis readout: 0.05 mm of "height" per scrolled pixel, quantised to 0.20 mm layers.
- `prefers-reduced-motion` disables animation and page transitions.
