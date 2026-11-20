/* Layer Up Labs calendar — used by the booking form (book/index.html)
   and the availability admin page (book/admin/index.html).

   Busy days are kept by a small Google Apps Script "helper" on Emmet's
   Google account. AVAILABILITY_URL below is that helper's web app address.
   It returns { ok: true, data: { weekdays: [0, 6], dates: ["2026-12-24"] } }
   weekdays: 0 = Sunday ... 6 = Saturday, blocked every week.
   dates:    single days, written YYYY-MM-DD. */

const AVAILABILITY_URL = 'https://script.google.com/macros/s/AKfycbxPeP1OaIoo_o6tWRBpneW9oI0bp9Ahcon4NkP4XC7WApB8wGSohv3C4tNDE5pg4dFs9A/exec';

(function () {
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };

  const long = (s) => {
    const d = parse(s);
    return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const tidy = (data) => ({
    weekdays: Array.isArray(data?.weekdays) ? data.weekdays : [],
    dates: Array.isArray(data?.dates) ? data.dates : [],
  });

  // Loads busy days. Never throws: if the helper can't be reached, every day is open.
  async function loadUnavailable() {
    if (!AVAILABILITY_URL) return tidy();
    try {
      const res = await fetch(`${AVAILABILITY_URL}?t=${Date.now()}`, { cache: 'no-store' });
      const body = await res.json();
      return tidy(body.data);
    } catch (e) {
      return tidy();
    }
  }

  // Password-checked calls for the admin page. Returns the helper's reply,
  // or { ok: false, error: 'offline' } if it can't be reached.
  async function adminCall(body) {
    if (!AVAILABILITY_URL) return { ok: false, error: 'not-set-up' };
    try {
      // Sent as plain text so the browser doesn't need extra permission from Google.
      const res = await fetch(AVAILABILITY_URL, { method: 'POST', body: JSON.stringify(body) });
      const reply = await res.json();
      if (reply.data) reply.data = tidy(reply.data);
      return reply;
    } catch (e) {
      return { ok: false, error: 'offline' };
    }
  }

  /* opts:
       mode:        'pick' (visitor chooses one day) or 'admin' (toggle busy days)
       unavailable: { weekdays: [], dates: [] }
       monthsAhead: how far ahead visitors can book (default 6)
       onChange:    called with the picked date (pick) or the busy list (admin) */
  function Calendar(root, opts = {}) {
    const mode = opts.mode || 'pick';
    const monthsAhead = opts.monthsAhead ?? 6;
    const busyDates = new Set(opts.unavailable?.dates || []);
    const busyWeekdays = new Set(opts.unavailable?.weekdays || []);
    const start = today();
    const first = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(start.getFullYear(), start.getMonth() + monthsAhead, 1);
    let view = new Date(first);
    let picked = null;
    let focusDate = iso(start);

    const isPast = (d) => d < start;
    const isBusy = (s) => busyDates.has(s) || busyWeekdays.has(parse(s).getDay());
    const canPick = (s) => !isPast(parse(s)) && !isBusy(s);

    root.classList.add('cal', `cal--${mode}`);
    root.innerHTML = `
      <div class="cal__head">
        <button type="button" class="cal__nav" data-step="-1" aria-label="Previous month"><svg width="10" height="18" aria-hidden="true"><path d="M8.5 1.5 1.5 9l7 7.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
        <h3 class="cal__title" aria-live="polite"></h3>
        <button type="button" class="cal__nav" data-step="1" aria-label="Next month"><svg width="10" height="18" aria-hidden="true"><path d="M1.5 1.5 8.5 9l-7 7.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button>
      </div>
      <div class="cal__week" aria-hidden="true">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="cal__grid" role="grid"></div>`;
    const title = root.querySelector('.cal__title');
    const grid = root.querySelector('.cal__grid');
    const prev = root.querySelector('[data-step="-1"]');
    const next = root.querySelector('[data-step="1"]');

    const render = () => {
      title.textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
      prev.disabled = view <= first;
      next.disabled = mode === 'pick' && new Date(view.getFullYear(), view.getMonth() + 1, 1) >= last;
      const lead = view.getDay();
      const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      // Keep the roving focus inside this month.
      if (!focusDate.startsWith(`${view.getFullYear()}-${pad(view.getMonth() + 1)}`)) {
        const firstOpen = [...Array(count)].map((_, i) => iso(new Date(view.getFullYear(), view.getMonth(), i + 1)))
          .find((s) => (mode === 'admin' ? !isPast(parse(s)) : canPick(s)));
        focusDate = firstOpen || iso(view);
      }
      let html = '';
      for (let i = 0; i < lead; i++) html += '<span class="cal__pad"></span>';
      for (let day = 1; day <= count; day++) {
        const d = new Date(view.getFullYear(), view.getMonth(), day);
        const s = iso(d);
        const past = isPast(d);
        const busy = isBusy(s);
        const weekly = busyWeekdays.has(d.getDay());
        const cls = ['cal__day'];
        if (past) cls.push('is-past');
        if (busy) cls.push('is-busy');
        if (weekly) cls.push('is-weekly');
        if (s === iso(start)) cls.push('is-today');
        if (s === picked) cls.push('is-picked');
        const disabled = past || (mode === 'pick' && busy) || (mode === 'admin' && weekly);
        const state = mode === 'admin'
          ? (busy ? (weekly ? 'busy every week' : 'busy') : 'available')
          : (past ? 'past' : busy ? 'unavailable' : 'available');
        html += `<button type="button" class="${cls.join(' ')}" data-date="${s}"
          ${disabled ? 'aria-disabled="true"' : ''} ${mode === 'pick' ? `aria-pressed="${s === picked}"` : `aria-pressed="${busy}"`}
          tabindex="${s === focusDate ? 0 : -1}" aria-label="${long(s)}, ${state}"><span>${day}</span></button>`;
      }
      grid.innerHTML = html;
    };

    const go = (step) => {
      const v = new Date(view.getFullYear(), view.getMonth() + step, 1);
      if (v < first || (mode === 'pick' && v >= last)) return false;
      view = v;
      render();
      return true;
    };

    const choose = (s) => {
      if (mode === 'pick') {
        if (!canPick(s)) return;
        picked = picked === s ? null : s;
        opts.onChange?.(picked);
      } else {
        const d = parse(s);
        if (isPast(d) || busyWeekdays.has(d.getDay())) return;
        busyDates.has(s) ? busyDates.delete(s) : busyDates.add(s);
        opts.onChange?.(api.value());
      }
      focusDate = s;
      render();
      grid.querySelector(`[data-date="${s}"]`)?.focus();
    };

    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    grid.addEventListener('click', (e) => {
      const b = e.target.closest('.cal__day');
      if (b) choose(b.dataset.date);
    });
    grid.addEventListener('keydown', (e) => {
      const b = e.target.closest('.cal__day');
      if (!b) return;
      const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (e.key in moves) {
        e.preventDefault();
        const d = parse(b.dataset.date);
        d.setDate(d.getDate() + moves[e.key]);
        if (d < start && mode === 'pick') return;
        const s = iso(d);
        focusDate = s;
        if (d.getMonth() !== view.getMonth()) {
          if (!go(d < view ? -1 : 1)) return;
          focusDate = s;
          render();
        } else render();
        grid.querySelector(`[data-date="${s}"]`)?.focus();
      }
    });

    const api = {
      value: () => (mode === 'pick' ? picked : { weekdays: [...busyWeekdays].sort(), dates: [...busyDates].filter((s) => !isPast(parse(s))).sort() }),
      clear: () => { picked = null; opts.onChange?.(null); render(); },
      setWeekdays: (days) => { busyWeekdays.clear(); days.forEach((d) => busyWeekdays.add(d)); render(); opts.onChange?.(api.value()); },
      setUnavailable: (u) => {
        busyDates.clear(); (u.dates || []).forEach((s) => busyDates.add(s));
        busyWeekdays.clear(); (u.weekdays || []).forEach((d) => busyWeekdays.add(d));
        if (picked && !canPick(picked)) { picked = null; opts.onChange?.(null); }
        render();
      },
    };
    render();
    return api;
  }

  window.LULCalendar = { Calendar, loadUnavailable, adminCall, long, ready: () => Boolean(AVAILABILITY_URL) };
})();
