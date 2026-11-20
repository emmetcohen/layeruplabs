# Layer Up Labs

Plain HTML + one stylesheet (`style.css`). No build step.

- Pages: `index.html`, `work.html`, `shop.html`, `about.html`, `contact.html`
- Booking photo sessions: `book/index.html`, live at layeruplabs.com/book.
  Photos themselves live in Work > Photography; the Book page only has services,
  prices, a short about and the booking form.
  - Linked from every page's menu ("Book"), the blue banner on the home page, and a
    "Book a session" box under every Photography set on the Work page
    (wording is in the `book-cta` template in `work.html`).
  - Prices: replace each `$___` in the Services section of `book/index.html`.
  - Booking form: opens the visitor's email app; see the comment above it to switch to Formspree.
  - `photography/` just forwards old links to Work > Photography.
- Colors and fonts: variables at the top of `style.css`
- Photos: put files in `images/`. For a card that says "Photo coming soon", replace
  `<div class="thumb thumb--empty">Photo coming soon</div>` with
  `<div class="thumb"><img src="images/your-photo.jpg" alt="Describe the photo"></div>`
- Shop: sells through Etsy (https://www.etsy.com/shop/LayerUpLabs); the site links out for checkout.
- Preview: `python3 -m http.server 8000`, then open http://localhost:8000
