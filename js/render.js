/* render.js — builds the data-driven pages from projects.json + site.json.
   Page is chosen by <body data-page="home|work|category|project|about">. */
(function () {
  'use strict';
  var EC = window.EC, $ = EC.$, $$ = EC.$$, esc = EC.esc, ph = EC.ph;
  var MODEL_VIEWER_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';

  /* ---------- shared bits ------------------------------------------- */
  function dimLine(label) {
    return '<div class="dim" aria-hidden="true"><i></i><span>' + esc(label) + '</span><i></i></div>';
  }
  function fmtDate(d) {
    var m = /^(\d{4})-(\d{2})$/.exec(d || '');
    if (!m) return ph(d || '[YYYY-MM]');
    var names = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return names[+m[2] - 1] + ' ' + m[1];
  }
  function partNo(project, data) {
    var cat = byId(data.categories, project.category);
    var inCat = data.projects.filter(function (p) { return p.category === project.category; });
    var n = inCat.indexOf(project) + 1;
    return 'EC-' + (cat ? cat.code : '00') + '-' + String(n).padStart(2, '0');
  }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function img(src, alt, cls, extra) {
    return '<img class="' + (cls || '') + '" src="' + esc(src) + '" alt="' + esc(alt || '') + '" loading="lazy" decoding="async"' + (extra || '') + '>';
  }
  function notice(html) { return '<div class="notice" role="alert">' + html + '</div>'; }
  function setMeta(title, desc) {
    document.title = title;
    var m = $('meta[name="description"]');
    if (m && desc) m.setAttribute('content', desc);
  }
  function load() {
    return Promise.all([EC.projects(), EC.site(), EC.ready]).then(function (r) { return { data: r[0], site: r[1] }; });
  }

  /* ---------- tiles ---------------------------------------------------- */
  function projectTile(p, data) {
    var cat = byId(data.categories, p.category) || { name: p.category };
    var hasWire = !!p.wire;
    return '<a class="tile' + (hasWire ? '' : ' tile--tint') + '" href="project.html?p=' + encodeURIComponent(p.id) + '" data-cat="' + esc(p.category) + '">' +
      '<div class="tile__media">' +
      img(p.cover, p.coverAlt || p.title, 'tile__base') +
      (hasWire ? img(p.wire, '', 'tile__wire', ' aria-hidden="true"') : '') +
      '<span class="tile__part">' + esc(partNo(p, data)) + '</span></div>' +
      '<div class="tile__body"><span class="tile__cat">' + esc(cat.name) + '</span>' +
      '<h3>' + ph(p.title) + '</h3><p>' + ph(p.summary || '') + '</p></div></a>';
  }
  function categoryTile(c, data) {
    var n = data.projects.filter(function (p) { return p.category === c.id; }).length;
    return '<a class="tile tile--cat tile--tint" href="category.html?c=' + encodeURIComponent(c.id) + '">' +
      '<div class="tile__media">' + img(c.cover, c.name + ' department', 'tile__base') +
      '<span class="tile__part">DEPT ' + esc(c.code) + '</span></div>' +
      '<div class="tile__body"><span class="tile__cat">' + esc(c.tagline) + '</span>' +
      '<h3>' + esc(c.name) + ' <span class="count">' + n + ' PROJECT' + (n === 1 ? '' : 'S') + '</span></h3>' +
      '<p>' + ph(c.blurb) + '</p></div></a>';
  }

  /* ---------- HOME ----------------------------------------------------- */
  function initHome() {
    var grid = $('#featured-grid');
    load().then(function (r) {
      var feat = r.data.projects.filter(function (p) { return p.featured; }).slice(0, 6);
      grid.innerHTML = feat.map(function (p) { return projectTile(p, r.data); }).join('');
      var depts = $('#dept-grid');
      if (depts) depts.innerHTML = r.data.categories.map(function (c) { return categoryTile(c, r.data); }).join('');
      var contact = $('#contact-links');
      if (contact && r.site) {
        var L = r.site.links || {};
        var row = function (label, url, text) {
          return '<dt>' + label + '</dt><dd>' + (EC.isPlaceholderUrl(url) ? '<span class="ph">' + esc(url || '[URL]') + '</span>' : '<a href="' + esc(url) + '">' + esc(text) + '</a>') + '</dd>';
        };
        contact.innerHTML =
          row('Email', r.site.email ? 'mailto:' + r.site.email : '', r.site.email) +
          row('Studio', L.layerUpLabs, 'Layer Up Labs') +
          row('Shop', L.etsy, 'etsy.com/shop/LayerUpLabs') +
          row('Instagram', L.instagram, 'Instagram') +
          row('LinkedIn', L.linkedin, 'LinkedIn') +
          '<dt>Based</dt><dd>' + esc(r.site.location || 'Lutz, Florida') + '</dd>';
        EC.externalize(contact);
      }
      EC.externalize(grid);
    }).catch(function (e) { grid.innerHTML = notice(dataError(e)); });
    initPortrait();
  }

  /* Portrait: wireframe by default, real photo on hover/focus/tap.
     If portrait-wire.jpg isn't supplied but portrait.jpg is, an edge-detect
     filter turns the real photo into the wireframe automatically. */
  function initPortrait() {
    var fig = $('[data-portrait]');
    if (!fig) return;
    var real = $('.portrait__real', fig), wire = $('.portrait__wire', fig);
    var realSrc = real.getAttribute('data-src'), wireSrc = wire.getAttribute('data-src');
    Promise.all([EC.imageExists(realSrc), EC.imageExists(wireSrc)]).then(function (ok) {
      real.src = ok[0] ? realSrc : EC.placeholderFor(realSrc);
      if (ok[1]) wire.src = wireSrc;
      else if (ok[0]) { wire.src = realSrc; wire.classList.add('is-filter'); }
      else wire.src = EC.placeholderFor(wireSrc);
    });
    fig.addEventListener('click', function () { fig.classList.toggle('is-real'); });
    fig.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fig.classList.toggle('is-real'); } });
  }

  /* ---------- WORK ----------------------------------------------------- */
  function initWork() {
    load().then(function (r) {
      var data = r.data;
      $('#dept-grid').innerHTML = data.categories.map(function (c) { return categoryTile(c, data); }).join('');
      var bar = $('#filters'), grid = $('#project-grid'), count = $('#result-count');
      grid.innerHTML = data.projects.map(function (p) { return projectTile(p, data); }).join('');
      var opts = [{ id: 'all', name: 'All' }].concat(data.categories);
      bar.innerHTML = opts.map(function (c) {
        return '<button type="button" data-f="' + esc(c.id) + '" aria-pressed="false">' + esc(c.name) + '</button>';
      }).join('');
      function apply(f, push) {
        if (!byId(opts, f)) f = 'all';
        var shown = 0;
        $$('.tile', grid).forEach(function (t) {
          var show = f === 'all' || t.getAttribute('data-cat') === f;
          t.hidden = !show; if (show) shown++;
        });
        $$('button', bar).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-f') === f)); });
        count.textContent = 'Showing ' + shown + ' of ' + data.projects.length + ' projects' + (f === 'all' ? '' : ' · ' + byId(opts, f).name);
        if (push) { try { history.replaceState(null, '', f === 'all' ? location.pathname : '?c=' + f); } catch (e) { /* file:// */ } }
      }
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (b) apply(b.getAttribute('data-f'), true);
      });
      apply(new URLSearchParams(location.search).get('c') || 'all', false);
      EC.externalize();
    }).catch(function (e) { $('#dept-grid').innerHTML = notice(dataError(e)); });
  }

  /* ---------- CATEGORY ------------------------------------------------- */
  function initCategory() {
    var main = $('#main');
    load().then(function (r) {
      var data = r.data, id = new URLSearchParams(location.search).get('c');
      var cat = byId(data.categories, id);
      if (!cat) {
        main.innerHTML = '<div class="wrap">' + notice('No department called <code>' + esc(id || '') + '</code>. <a href="work.html">Back to all work</a>.') + '</div>';
        return;
      }
      setMeta(cat.name + ' — Emmet', cat.blurb);
      var projects = data.projects.filter(function (p) { return p.category === cat.id; });
      var actions = (cat.actions || []).map(function (a) {
        return '<a class="btn' + (a.primary ? '' : ' btn--ghost') + '" href="' + esc(a.url) + '">' + esc(a.label) + '</a>';
      }).join('');
      var body;
      if (cat.groups && cat.groups.length) {
        body = cat.groups.map(function (g) {
          var items = projects.filter(function (p) { return p.group === g.id; });
          if (!items.length) return '';
          return '<section class="group" aria-labelledby="g-' + esc(g.id) + '"><h2 id="g-' + esc(g.id) + '">' + esc(g.title) + '</h2><div class="grid">' +
            items.map(function (p) { return projectTile(p, data); }).join('') + '</div></section>';
        }).join('');
      } else {
        body = '<div class="grid" style="margin-top:2rem">' + projects.map(function (p) { return projectTile(p, data); }).join('') + '</div>';
      }
      var others = data.categories.filter(function (c) { return c.id !== cat.id; }).map(function (c) {
        return '<a class="link-arrow" href="category.html?c=' + esc(c.id) + '">' + esc(c.code) + ' ' + esc(c.name) + '</a>';
      }).join(' ');
      main.innerHTML =
        '<div class="wrap">' +
        '<header class="page-head"><p class="crumbs"><a href="work.html">Work</a><span aria-hidden="true">/</span>' + esc(cat.name) + '</p>' +
        '<div class="page-head__row"><div><p class="eyebrow">Department ' + esc(cat.code) + ' · ' + esc(cat.tagline) + '</p><h1>' + esc(cat.name) + '</h1></div>' +
        '<span class="tag-rev">SHEET 3 OF 5 · REV A</span></div>' +
        dimLine(projects.length + (projects.length === 1 ? ' PROJECT' : ' PROJECTS')) +
        '<p class="page-head__lead">' + ph(cat.blurb) + '</p>' +
        (actions ? '<div class="btn-row" style="margin-top:1.4rem">' + actions + '</div>' : '') +
        (cat.note ? '<p class="dept-note">' + ph(cat.note.text) + (cat.note.url ? ' <a href="' + esc(cat.note.url) + '">' + esc(cat.note.linkText || cat.note.url) + '</a>' : '') + '</p>' : '') +
        '</header>' + body +
        '<nav class="sec" aria-label="Other departments"><p class="eyebrow">Other departments</p><div style="display:flex;flex-wrap:wrap;gap:1rem 1.6rem">' + others + '</div></nav>' +
        '</div>';
      EC.externalize(main);
    }).catch(function (e) { main.innerHTML = '<div class="wrap">' + notice(dataError(e)) + '</div>'; });
  }

  /* ---------- PROJECT (spec sheet) ------------------------------------- */
  function initProject() {
    var main = $('#main');
    load().then(function (r) {
      var data = r.data, id = new URLSearchParams(location.search).get('p');
      var p = byId(data.projects, id);
      if (!p) {
        main.innerHTML = '<div class="wrap">' + notice('No project called <code>' + esc(id || '') + '</code>. <a href="work.html">Back to all work</a>.') + '</div>';
        return;
      }
      var cat = byId(data.categories, p.category) || { id: p.category, name: p.category };
      setMeta(p.title + ' — Emmet', p.summary);
      var sameCat = data.projects.filter(function (x) { return x.category === p.category; });
      var pool = sameCat.length > 1 ? sameCat : data.projects;
      var next = pool[(pool.indexOf(p) + 1) % pool.length];
      var tol = p.tolerances || {};
      var tools = (p.tools && p.tools.length) ? p.tools.map(ph).join(' · ') : '—';
      var gallery = (p.gallery || []).map(function (g, i) {
        return '<li><button type="button" data-i="' + i + '" aria-label="Open image ' + (i + 1) + ' of ' + p.gallery.length + ': ' + esc(g.alt) + '">' +
          img(g.src, g.alt) + '<span class="fig">FIG. ' + String(i + 1).padStart(2, '0') + '</span></button></li>';
      }).join('');
      var links = (p.links || []).map(function (l) { return '<a class="btn btn--ghost" href="' + esc(l.url) + '">' + esc(l.label) + '</a>'; }).join('');

      main.innerHTML =
        '<div class="wrap">' +
        '<header class="page-head"><p class="crumbs"><a href="work.html">Work</a><span aria-hidden="true">/</span><a href="category.html?c=' + esc(cat.id) + '">' + esc(cat.name) + '</a><span aria-hidden="true">/</span>' + esc(p.title) + '</p></header>' +
        '<article class="sheet crop">' +
        '<div class="sheet__title"><div><p class="eyebrow">Spec sheet · ' + esc(partNo(p, data)) + '</p><h1>' + ph(p.title) + '</h1></div><span class="tag-rev">SHEET ' + (sameCat.indexOf(p) + 1) + ' OF ' + sameCat.length + ' · REV A</span></div>' +
        '<figure class="sheet__hero">' + img(p.cover, p.coverAlt || p.title, '', ' fetchpriority="high"').replace('loading="lazy"', 'loading="eager"') + '</figure>' +
        '<dl class="sheet__tb">' +
        '<div><dt>Part no.</dt><dd class="mono">' + esc(partNo(p, data)) + '</dd></div>' +
        '<div><dt>Date</dt><dd>' + fmtDate(p.date) + '</dd></div>' +
        '<div><dt>Department</dt><dd><a href="category.html?c=' + esc(cat.id) + '">' + esc(cat.name) + '</a></dd></div>' +
        '<div><dt>Tools used</dt><dd>' + tools + '</dd></div></dl>' +
        '<section class="sheet__sec" aria-labelledby="h-idea"><h2 id="h-idea"><b>01</b>The idea</h2><p class="idea">' + ph(p.description) + '</p></section>' +
        '<section class="sheet__sec" aria-labelledby="h-tol"><h2 id="h-tol"><b>02</b>Tolerances</h2><div class="tol">' +
        '<div><h3>Out of spec — what went wrong</h3><p>' + ph(tol.wentWrong || '[WHAT WENT WRONG]') + '</p></div>' +
        '<div><h3>Recalibrated — what I learned</h3><p>' + ph(tol.learned || '[WHAT I LEARNED]') + '</p></div></div></section>' +
        (p.model ? '<section class="sheet__sec" aria-labelledby="h-3d"><h2 id="h-3d"><b>03</b>Orbit the model</h2><div class="viewer" id="viewer"></div></section>' : '') +
        '<section class="sheet__sec" aria-labelledby="h-gal"><h2 id="h-gal"><b>' + (p.model ? '04' : '03') + '</b>Gallery</h2><ul class="gallery">' + gallery + '</ul></section>' +
        (links ? '<section class="sheet__sec" aria-label="Related links"><div class="proj-links">' + links + '</div></section>' : '') +
        '</article>' +
        '<a class="next" href="project.html?p=' + encodeURIComponent(next.id) + '"><span><small>Next project</small><strong>' + ph(next.title) + '</strong></span><span class="arrow" aria-hidden="true">→</span></a>' +
        '</div>' +
        '<dialog class="lightbox" aria-label="Image viewer"><img alt=""><div class="lightbox__bar"><button type="button" data-a="prev">‹ Prev</button><p></p><button type="button" data-a="next">Next ›</button><button type="button" data-a="close">Close ✕</button></div></dialog>';

      setupLightbox(p.gallery || []);
      if (p.model) mountModel($('#viewer'), p.model, p.title);
      EC.externalize(main);
    }).catch(function (e) { main.innerHTML = '<div class="wrap">' + notice(dataError(e)) + '</div>'; });
  }

  function setupLightbox(items) {
    var dlg = $('dialog.lightbox'); if (!dlg || !items.length) return;
    var im = $('img', dlg), cap = $('p', dlg), i = 0, opener = null;
    function show(n) {
      i = (n + items.length) % items.length;
      im.removeAttribute('data-fb');
      im.src = items[i].src; im.alt = items[i].alt || '';
      cap.textContent = 'FIG. ' + String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0') + ' — ' + (items[i].alt || '');
    }
    $$('.gallery button').forEach(function (b) {
      b.addEventListener('click', function () {
        opener = b; show(+b.getAttribute('data-i'));
        if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
      });
    });
    dlg.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('button[data-a]');
      if (e.target === dlg || (a && a.getAttribute('data-a') === 'close')) dlg.close();
      else if (a) show(i + (a.getAttribute('data-a') === 'next' ? 1 : -1));
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(i + 1);
      if (e.key === 'ArrowLeft') show(i - 1);
    });
    dlg.addEventListener('close', function () { if (opener) opener.focus(); });
  }

  /* 3D viewer: <model-viewer> only loads when a GLB actually exists. */
  function comingSoon(src, why) {
    return '<div class="soon"><div><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6 54 18v28L32 58 10 46V18Z"/><path d="M10 18l22 12 22-12M32 30v28"/></svg>' +
      '<h3>Model coming soon</h3><p>' + (why || 'The interactive 3D model is still being exported.') +
      ' To enable this viewer, drop your exported file in as <code>' + esc(src) + '</code> — no code changes needed.</p></div></div>';
  }
  function mountModel(box, src, title) {
    fetch(src, { method: 'HEAD' }).then(function (r) {
      var type = r.headers.get('content-type') || '';
      if (!r.ok || /text\/html/i.test(type)) throw new Error('missing');
      return true;
    }).then(function () {
      var load = function () {
        var s = document.createElement('script');
        s.type = 'module'; s.src = MODEL_VIEWER_SRC; s.crossOrigin = 'anonymous';
        s.onerror = function () { box.innerHTML = comingSoon(src, 'The 3D viewer library could not be loaded (are you offline?).'); };
        document.head.appendChild(s);
        box.innerHTML = '<model-viewer src="' + esc(src) + '" alt="Interactive 3D model: ' + esc(title) + '" camera-controls touch-action="pan-y" shadow-intensity="1" exposure="1.05" ' +
          (EC.reduced() ? '' : 'auto-rotate ') + 'loading="lazy"></model-viewer><span class="viewer__hint">DRAG TO ORBIT · SCROLL / PINCH TO ZOOM · ARROW KEYS WORK TOO</span>';
      };
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '200px' });
        io.observe(box);
      } else load();
    }).catch(function () { box.innerHTML = comingSoon(src); });
  }

  function dataError(e) {
    return '<strong>Couldn’t load the site data.</strong> This site fetches <code>projects.json</code>, so it has to be served over HTTP (not opened as a file). ' +
      'From the project folder run <code>python3 -m http.server 8000</code> and visit <code>http://localhost:8000</code>.<br><small>' + esc(e && e.message) + '</small>';
  }

  /* ---------- boot ----------------------------------------------------- */
  var page = document.body.getAttribute('data-page');
  var init = { home: initHome, work: initWork, category: initCategory, project: initProject }[page];
  if (init) init();
})();
