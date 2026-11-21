/* Layer Up Labs - anonymous visit counter.
   Sends one small note per page view to the Google helper: the page, phone or
   computer, which website sent the visitor, whether it's their first page
   today, and (once a day) their approximate city. No names, no IP addresses
   saved, no cookies, no ad trackers.
   The only thing stored in the visitor's browser is the date of their last
   visit, so a visitor isn't counted twice on the same day.
   Emmet's own devices stop counting once he unlocks the admin page. */

(function () {
  const HELPER = 'https://script.google.com/macros/s/AKfycbxPeP1OaIoo_o6tWRBpneW9oI0bp9Ahcon4NkP4XC7WApB8wGSohv3C4tNDE5pg4dFs9A/exec';

  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const skip = store.get('lul-no-track') || navigator.webdriver ||
    /^(localhost|127\.0\.0\.1|\[::1\])$|\.(localhost|test)$/.test(location.hostname);

  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const last = store.get('lul-last-visit');
  let newToday = last !== today;
  const returning = Boolean(last) && last !== today;
  store.set('lul-last-visit', today);

  const device = () => {
    const touch = matchMedia('(pointer: coarse)').matches;
    if (!touch) return 'computer';
    return Math.min(screen.width, screen.height) >= 700 ? 'tablet' : 'phone';
  };
  const ref = () => {
    try {
      const host = new URL(document.referrer).hostname;
      return host && host !== location.hostname ? host : '';
    } catch (e) { return ''; }
  };

  const send = (type, extra) => {
    if (skip) return;
    const body = JSON.stringify({
      action: 'hit', type, path: location.pathname, device: device(), ref: ref(),
      newToday: false, returning: false, ...extra,
    });
    // sendBeacon survives the visitor leaving the page; fetch is the backup.
    if (!(navigator.sendBeacon && navigator.sendBeacon(HELPER, body))) {
      fetch(HELPER, { method: 'POST', body, mode: 'no-cors', keepalive: true }).catch(() => {});
    }
  };

  const view = (path) => {
    send('view', { path, newToday, returning });
    newToday = false;
  };

  // Approximate city for a visitor's first page of the day. The lookup
  // service sees the visitor's IP to answer, but only city / state / country
  // are kept and sent on; the IP is never saved.
  const lookup = async () => {
    const services = [
      'https://get.geojs.io/v1/ip/geo.json',
      'https://ipapi.co/json/',
    ];
    for (const url of services) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      try {
        const d = await (await fetch(url, { signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })).json();
        const parts = [d.city, d.region, d.country_code, d.country_name || d.country].map((v) => String(v || '').replace(/\|/g, ' ').slice(0, 40));
        if (parts[2]) return parts.join('|');
      } catch (e) { /* try the next service */ } finally { clearTimeout(timer); }
    }
    return '';
  };

  // Work page projects live after the # (work.html#photography/photography-cars).
  const pathNow = () => location.pathname + (location.hash.includes('/') ? location.hash : '');
  if (newToday && !skip) {
    // First page today: wait (up to a few seconds) for the city, but never lose
    // the visit if they leave first.
    const first = { path: pathNow(), newToday: true, returning };
    newToday = false;
    let sent = false;
    const go = (loc) => { if (!sent) { sent = true; send('view', { ...first, loc }); } };
    addEventListener('pagehide', () => go(''), { once: true });
    lookup().then(go);
  } else {
    view(pathNow());
  }
  addEventListener('hashchange', () => { if (location.hash.includes('/')) view(pathNow()); });

  // Instagram link clicks.
  document.addEventListener('click', (e) => {
    if (e.target.closest('a[href*="instagram.com"]')) send('instagram');
  });

  // Called by the booking and review forms.
  window.lulTrack = (type, detail) => send(type, { detail: detail || '' });
})();
