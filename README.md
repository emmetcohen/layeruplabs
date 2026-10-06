# Layer Up Labs

Plain HTML + one stylesheet (`style.css`). No build step.

- Pages: `index.html`, `work.html`, `shop.html`, `about.html`, `contact.html`
- Colors and fonts: variables at the top of `style.css`
- Photos: put files in `images/`. For a card that says "Photo coming soon", replace
  `<div class="thumb thumb--empty">Photo coming soon</div>` with
  `<div class="thumb"><img src="images/your-photo.jpg" alt="Describe the photo"></div>`
- Shop: sells through Etsy (https://www.etsy.com/shop/LayerUpLabs); the site links out for checkout.
- Preview: `python3 -m http.server 8000`, then open http://localhost:8000
