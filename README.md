# Layer Up Labs — site guide

Plain HTML and CSS. No build step, no framework, no dependencies.
Open any `.html` file in a browser to see it. Edit it in any text editor.

## Files

| File | What it is |
|---|---|
| `index.html` | Home page |
| `work.html` | The full list of pieces |
| `piece-macaroni-earrings.html` | A single piece — also the template for new ones |
| `commissions.html` | Custom work |
| `about.html` | Emmet's page |
| `style.css` | All the styling for every page |
| `images/` | Create this folder and put photos in it |

Anywhere you see `<!-- EDIT: ... -->` there's something to change.

## Adding photos

1. Make a folder called `images` next to the HTML files.
2. Drop the photo in — name it something simple like `earrings.jpg`.
3. Find the empty `<div class="card__shot"></div>` for that piece and put the photo inside it:

```html
<div class="card__shot">
  <img src="images/earrings.jpg" alt="Macaroni earrings">
</div>
```

The `alt` text describes the photo for screen readers and for anyone whose
image doesn't load. Write what's in the picture.

Until a photo is added, the slot shows a layer-line texture on purpose — an
empty slot looks intentional rather than broken.

## Adding a new piece

1. Copy `piece-macaroni-earrings.html` and rename it, e.g. `piece-rc-car.html`.
2. Change the `<title>`, the headline, the paragraphs, and the spec rows.
3. If it isn't for sale, delete the `btn--buy` link and the line under it.
4. In `work.html` and `index.html`, copy one `<a class="card">` block and point
   its `href` at your new file.

## Changing colors

Everything lives at the top of `style.css` under `:root`. Change a hex value
there and it updates everywhere. `--perimeter` is the teal, `--infill` is the
orange — both borrowed from how slicer software color-codes a print.

## Before it goes live

- [ ] Replace `hello@layeruplabs.com` with the real address (it appears on every page)
- [ ] Add real photos, especially on the About page
- [ ] Rewrite the About page in Emmet's own words — the current text is a starting draft
- [ ] Check the Etsy links still point at live listings

## Putting it online

Any static host works and most are free for a site this size — Netlify,
Cloudflare Pages, or GitHub Pages. Drag the folder in, point the
layeruplabs.com domain at it, done.
