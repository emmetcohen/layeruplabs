/* core.js — shared behaviour for every page. Vanilla JS, no dependencies.
   Loaded in <head> (not deferred) so the image-fallback listener is armed
   before any <img> can fail. Everything else waits for DOMContentLoaded. */
(function () {
  'use strict';
  var EC = (window.EC = window.EC || {});

  /* ---------- tiny helpers ------------------------------------------ */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  /* Escape, then highlight [BRACKETED PLACEHOLDERS] so they are easy to spot. */
  var ph = function (s) { return esc(s).replace(/\[[A-Z0-9][^\]\n]*\]/g, function (m) { return '<span class="ph">' + m + '</span>'; }); };
  var isPlaceholderUrl = function (u) { return !u || /^\s*\[/.test(u); };
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  EC.$ = $; EC.$$ = $$; EC.esc = esc; EC.ph = ph; EC.reduced = reduced; EC.isPlaceholderUrl = isPlaceholderUrl;

  /* ---------- image fallback: missing photo -> blueprint placeholder -- */
  /* assets/images/foo.jpg  ->  assets/placeholders/foo.svg  ->  missing.svg
     This is what lets you "replace a placeholder" by just dropping in a file. */
  var IMG_EXT = /\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i;
  EC.placeholderFor = function (src) {
    return src.replace(/(^|\/)assets\/images\//, '$1assets/placeholders/').replace(IMG_EXT, '.svg');
  };
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    var stage = img.getAttribute('data-fb') || '0';
    var cur = img.getAttribute('src') || '';
    if (stage === '0' && /assets\/images\//.test(cur)) {
      img.setAttribute('data-fb', '1');
      img.classList.add('is-placeholder');
      img.src = EC.placeholderFor(cur);
    } else if (stage !== '2') {
      img.setAttribute('data-fb', '2');
      img.src = 'assets/placeholders/missing.svg';
    }
  }, true);

  /* Probe whether a real image exists (used for the portrait wireframe). */
  EC.imageExists = function (src) {
    return new Promise(function (res) {
      var i = new Image();
      i.onload = function () { res(true); };
      i.onerror = function () { res(false); };
      i.src = src;
    });
  };

  /* ---------- data loading ------------------------------------------ */
  var cache = {};
  EC.json = function (path) {
    if (!cache[path]) {
      cache[path] = fetch(path).then(function (r) {
        if (!r.ok) throw new Error(path + ' → HTTP ' + r.status);
        return r.json();
      });
    }
    return cache[path];
  };
  EC.site = function () { return EC.json('site.json'); };
  EC.projects = function () { return EC.json('projects.json'); };

  /* ---------- external links: new tab + noopener + arrow marker ------ */
  EC.externalize = function (root) {
    $$('a[href]', root || document).forEach(function (a) {
      var href = a.getAttribute('href');
      if (!/^https?:\/\//i.test(href)) return;
      var u;
      try { u = new URL(href); } catch (e) { return; }
      if (u.origin === location.origin) return;
      a.target = '_blank';
      a.rel = 'noopener';
      if (!a.querySelector('.ext')) {
        a.insertAdjacentHTML('beforeend', '<span class="ext" aria-hidden="true">↗</span><span class="sr-only"> (opens in new tab)</span>');
      }
    });
  };

  /* ---------- shared chrome: header + footer ------------------------- */
  var SHEETS = { home: 1, work: 2, category: 3, project: 4, about: 5 };
  var NAV = [
    ['Home', 'index.html', 'home'],
    ['Work', 'work.html', 'work'],
    ['About', 'about.html', 'about'],
    ['Contact', 'index.html#contact', 'contact']
  ];
  function currentKey() {
    var p = document.body.getAttribute('data-page');
    return (p === 'category' || p === 'project') ? 'work' : p;
  }
  function buildHeader() {
    var cur = currentKey();
    var items = NAV.map(function (n) {
      return '<li><a href="' + n[1] + '"' + (n[2] === cur ? ' aria-current="page"' : '') + '>' + n[0] + '</a></li>';
    }).join('');
    var logo = '<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="#326080" stroke-width="1.6"><rect x="5" y="5" width="22" height="22" rx="2"/><path d="M5 12h22M12 5v22" stroke="#1B3347"/><circle cx="21" cy="21" r="3" fill="#805232" stroke="none"/></svg>';
    var h = document.createElement('header');
    h.className = 'site-header';
    h.innerHTML =
      '<div class="wrap">' +
      '<a class="brand" href="index.html" aria-label="Emmet — home">' + logo + 'EMMET <span class="tag-rev">REV A</span></a>' +
      '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">MENU</button>' +
      '<nav aria-label="Primary"><ul class="nav-list" id="site-nav">' + items + '</ul></nav>' +
      '</div>';
    document.body.insertBefore(h, document.body.firstChild);
    var skip = document.createElement('a');
    skip.className = 'skip'; skip.href = '#main'; skip.textContent = 'Skip to content';
    document.body.insertBefore(skip, document.body.firstChild);

    var btn = $('.nav-toggle', h), list = $('.nav-list', h);
    btn.addEventListener('click', function () {
      var open = list.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open);
      btn.textContent = open ? 'CLOSE' : 'MENU';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && list.classList.contains('is-open')) { btn.click(); btn.focus(); }
    });
  }
  function linkOrPlaceholder(label, url) {
    if (isPlaceholderUrl(url)) return '<span class="ph">' + esc(url || '[URL]') + '</span>';
    return '<a href="' + esc(url) + '">' + esc(label) + '</a>';
  }
  function buildFooter(site) {
    var L = (site && site.links) || {};
    var year = new Date().getFullYear();
    var sheet = SHEETS[document.body.getAttribute('data-page')] || 1;
    var f = document.createElement('footer');
    f.className = 'site-footer';
    f.innerHTML =
      '<div class="wrap">' +
      '<div class="titleblock" aria-hidden="true">' +
      '<div><span>Drawing</span>EMMET — PORTFOLIO</div><div><span>Drawn by</span>Emmet</div>' +
      '<div><span>Sheet</span>' + sheet + ' OF 5</div><div><span>Rev</span>A</div><div><span>Scale</span>1:1</div></div>' +
      '<div class="foot-cols">' +
      '<div><h2>Index</h2><ul>' +
      '<li><a href="work.html">Work</a></li><li><a href="about.html">About</a></li>' +
      '<li><a href="assets/resume.pdf" download>Résumé (PDF)</a></li></ul></div>' +
      '<div><h2>Layer Up Labs</h2><ul>' +
      '<li>' + linkOrPlaceholder('Layer Up Labs', L.layerUpLabs) + '</li>' +
      '<li>' + linkOrPlaceholder('Commission a piece', L.commissions) + '</li>' +
      '<li>' + linkOrPlaceholder('Etsy shop', L.etsy) + '</li></ul></div>' +
      '<div><h2>Elsewhere</h2><ul>' +
      '<li>' + linkOrPlaceholder('Email', site && site.email ? 'mailto:' + site.email : '') + '</li>' +
      '<li>' + linkOrPlaceholder('Instagram', L.instagram) + '</li>' +
      '<li>' + linkOrPlaceholder('LinkedIn', L.linkedin) + '</li></ul></div>' +
      '</div>' +
      '<p class="foot-small">© ' + year + ' EMMET · LUTZ, FLORIDA · HAND-DRAWN IN HTML, CSS &amp; JS</p>' +
      '</div>';
    document.body.appendChild(f);
    EC.externalize(f);
  }

  /* ---------- Z-axis readout: scroll = printer building layers ------- */
  function buildZ() {
    var z = document.createElement('div');
    z.className = 'zaxis'; z.setAttribute('aria-hidden', 'true');
    z.innerHTML = '<div class="zaxis__bar"><i></i></div><div><div class="zaxis__lbl">Z AXIS</div>' +
      '<div class="zaxis__val">0.00 MM</div><div class="zaxis__sub">LAYER 0000 · 0.20 MM</div></div>';
    document.body.appendChild(z);
    var val = $('.zaxis__val', z), sub = $('.zaxis__sub', z), fill = $('.zaxis__bar i', z);
    var LAYER = 0.2, MM_PER_PX = 0.05, ticking = false;
    function update() {
      ticking = false;
      var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      var y = Math.min(Math.max(scrollY, 0), max);
      var layers = Math.round((y * MM_PER_PX) / LAYER);
      val.textContent = (layers * LAYER).toFixed(2) + ' MM';
      sub.textContent = 'LAYER ' + String(layers).padStart(4, '0') + ' · 0.20 MM';
      fill.style.height = (y / max * 100).toFixed(1) + '%';
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------- page transitions -------------------------------------- */
  function buildTransitions() {
    var wipe = document.createElement('div');
    wipe.className = 'wipe'; wipe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(wipe);
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var u;
      try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.origin !== location.origin || /^(mailto|tel):/i.test(a.getAttribute('href'))) return;
      if (u.pathname === location.pathname && u.search === location.search) return; // same page / #hash
      if (reduced()) return;
      e.preventDefault();
      document.body.classList.add('is-leaving');
      setTimeout(function () { location.href = u.href; }, 260);
    });
    addEventListener('pageshow', function (e) { if (e.persisted) document.body.classList.remove('is-leaving'); });
  }

  /* ---------- intro: the blueprint draws itself (once per session) --- */
  function buildIntro() {
    var root = document.documentElement;
    if (!root.classList.contains('intro-on')) return;
    var main = $('main'), header = $('.site-header'), footer = $('.site-footer');
    var inertEls = [main, header, footer].filter(Boolean);
    inertEls.forEach(function (el) { el.setAttribute('inert', ''); });

    var d = function (path, delay, dur, cls) {
      return '<path class="d ' + (cls || '') + '" pathLength="1" style="--d:' + delay + 's;--t:' + dur + 's" d="' + path + '"/>';
    };
    var svg =
      '<svg class="intro__svg" viewBox="0 0 1000 440" aria-hidden="true">' +
      d('M10 10H990V430H10Z', 0, 0.8, 'c') + d('M26 26H974V414H26Z', 0.15, 0.8, 'c') +
      d('M420 120H580V280H420Z', 0.4, 0.9) +
      '<circle class="d" pathLength="1" style="--d:.7s;--t:.9s" cx="500" cy="200" r="80"/>' +
      d('M370 200H630M500 70V330', 1.0, 0.6, 'c') +
      d('M420 312V336M580 312V336M420 324H580', 1.3, 0.5, 'c') +
      d('M780 340H974V414M780 340V414', 1.4, 0.5, 'c') +
      '<text x="500" y="318" text-anchor="middle" font-size="12" letter-spacing="2" style="--d:1.6s;fill:var(--cyan)">160</text>' +
      '<text x="500" y="378" text-anchor="middle" font-size="22" letter-spacing="6" style="--d:1.5s;fill:var(--ink)">EMMET — PORTFOLIO</text>' +
      '<text x="877" y="382" text-anchor="middle" font-size="12" letter-spacing="2" style="--d:1.7s">SHEET 1 · REV A</text>' +
      '</svg>';
    var o = document.createElement('div');
    o.className = 'intro';
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Intro animation');
    o.innerHTML = svg +
      '<div class="intro__meta">Plotting sheet 1 · <span class="pct">0</span>%</div>' +
      '<button type="button" class="intro__skip">Skip ›</button>';
    document.body.appendChild(o);
    root.classList.remove('intro-on');           // overlay now covers the page
    document.body.style.overflow = 'hidden';

    var done = false, pct = $('.pct', o), t0 = performance.now(), TOTAL = 2300;
    function finish() {
      if (done) return;
      done = true;
      store.set('ec-intro', '1');
      o.classList.add('is-out');
      document.body.style.overflow = '';
      inertEls.forEach(function (el) { el.removeAttribute('inert'); });
      setTimeout(function () { o.remove(); }, 500);
    }
    (function tick(now) {
      if (done) return;
      var p = Math.min(1, (now - t0) / TOTAL);
      pct.textContent = Math.round(p * 100);
      if (p >= 1) setTimeout(finish, 250); else requestAnimationFrame(tick);
    })(t0);
    $('.intro__skip', o).addEventListener('click', finish);
    o.addEventListener('click', finish);
    document.addEventListener('keydown', function (e) { if (!done && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); finish(); } });
    $('.intro__skip', o).focus();
  }

  /* shared SVG filter: edge-detect "wireframe" look (blue lines on paper) */
  function buildFilters() {
    var s = document.createElement('div');
    s.setAttribute('aria-hidden', 'true');
    s.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    s.innerHTML =
      '<svg width="0" height="0" focusable="false"><filter id="ec-edge" color-interpolation-filters="sRGB">' +
      '<feColorMatrix type="saturate" values="0"/>' +
      '<feConvolveMatrix order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" preserveAlpha="true" edgeMode="duplicate"/>' +
      '<feComponentTransfer><feFuncR type="linear" slope="2.4"/><feFuncG type="linear" slope="2.4"/><feFuncB type="linear" slope="2.4"/></feComponentTransfer>' +
      '<feColorMatrix type="matrix" values="-.8 0 0 0 1  -.6 0 0 0 .945  -.4 0 0 0 .906  0 0 0 0 1"/>' +
      '</filter></svg>';
    document.body.appendChild(s);
  }

  /* ---------- boot ---------------------------------------------------- */
  EC.ready = new Promise(function (res) {
    document.addEventListener('DOMContentLoaded', function () {
      buildHeader();
      buildFilters();
      buildZ();
      buildTransitions();
      EC.externalize();
      // Footer needs site.json (social links); the page still works without it.
      EC.site().catch(function () { return null; }).then(function (site) {
        EC.siteData = site;
        buildFooter(site);
        buildIntro();
        $$('img').forEach(function (img) {          // images that failed before we were listening
          if (img.complete && img.naturalWidth === 0 && img.getAttribute('src') && !img.getAttribute('data-fb')) {
            img.dispatchEvent(new Event('error'));
          }
        });
        res(site);
      });
    });
  });
})();
