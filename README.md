# Layer Up Labs

Plain HTML + one stylesheet (`style.css`). No build step.

- Pages: `index.html`, `work.html`, `book/index.html`, `about.html`, `contact.html`
- Booking photo sessions: `book/index.html`, live at layeruplabs.com/book.
  Photos themselves live in Work > Photography; the Book page only has services,
  prices, a short about and the booking form.
  - Linked from every page's menu ("Book"), the blue banner on the home page, and a
    "Book a session" box under every Photography set on the Work page
    (wording is in the `book-cta` template in `work.html`).
  - Prices and "what's included": in the Services section of `book/index.html`.
  - FAQ: at the bottom of `book/index.html`; change any answer that isn't how you work.
  - Booking form: opens the visitor's email app; see the comment above it to switch to Formspree.
  - Calendar: `book/calendar.js` draws the date picker. Busy days come from a small
    Google Apps Script "helper" on Emmet's Google account; its web app link is
    `AVAILABILITY_URL` at the top of `book/calendar.js`.
  - Marking busy days: open **layeruplabs.com/book/admin/** (not linked anywhere, hidden
    from Google), enter the password, tap days or tick "Always busy on", then Save.
    Changes show on the booking calendar right away.
  - Stats: the admin page's **Stats** tab shows page views, visitors, booking forms,
    reviews, Instagram clicks, busiest days and hours, top pages, where visitors came
    from, and phone vs computer. `assets/track.js` (on every main page) sends one
    anonymous note per page view to the same helper, which saves it in a Google Sheet
    called "Layer Up Labs visits". No names, IPs or cookies; Emmet's own devices stop
    counting once they've unlocked the admin page.
  - The helper's code is `availability-helper.gs` in this folder. It holds the password,
    so it's in `.gitignore` and never published. To change the password, edit it there,
    paste it into the Apps Script project, and deploy a new version.
  - `photography/` just forwards old links to Work > Photography.
- Colors and fonts: variables at the top of `style.css`
- Photos: put files in `images/`. "Photo coming soon" slots are hidden on the live site
  (see the end of `style.css`); a slot shows up once you swap a photo into it. To fill one, replace
  `<div class="thumb thumb--empty">Photo coming soon</div>` with
  `<div class="thumb"><img src="images/your-photo.jpg" alt="Describe the photo"></div>`
- Preview: `python3 -m http.server 8000`, then open http://localhost:8000
- Search: `sitemap.xml` lists the main pages. Submit https://layeruplabs.com/sitemap.xml
  once in Google Search Console. Add new main pages to it.
- 3D Modeling is hidden on Home and Work until there's a render (see the comment above
  its tile in `index.html` and `work.html`).
