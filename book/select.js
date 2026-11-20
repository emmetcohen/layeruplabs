/* Layer Up Labs drop-downs.
   Turns every <select> inside a .book form into a drop-down styled like the
   date picker. The real <select> stays in the page (hidden) and keeps the
   value, so the forms work exactly as before. To add a choice, just add an
   <option> to the <select> in the HTML. */

(function () {
  let count = 0;
  const chevron = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5.25 7 9.25l4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const check = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="m3 7.5 2.6 2.6L11 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const all = [];

  function enhance(select) {
    const id = `pick-${++count}`;
    const label = select.closest('label');
    const labelText = label && label.querySelector('span');
    if (labelText && !labelText.id) labelText.id = `${id}-label`;
    const options = [...select.options];
    const placeholder = options.find((o) => o.value === '');
    const choices = options.filter((o) => o.value !== '');

    const wrap = document.createElement('div');
    wrap.className = 'pick';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick__btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', `${id}-list`);
    const text = document.createElement('span');
    text.id = `${id}-value`;
    btn.setAttribute('aria-labelledby', `${labelText ? labelText.id : ''} ${text.id}`.trim());
    btn.append(text);
    btn.insertAdjacentHTML('beforeend', chevron);

    const list = document.createElement('ul');
    list.className = 'pick__list';
    list.id = `${id}-list`;
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    if (labelText) list.setAttribute('aria-labelledby', labelText.id);
    list.hidden = true;
    choices.forEach((o, i) => {
      const li = document.createElement('li');
      li.id = `${id}-opt-${i}`;
      li.setAttribute('role', 'option');
      li.dataset.value = o.value;
      const name = document.createElement('span');
      name.textContent = o.textContent;
      li.append(name);
      li.insertAdjacentHTML('beforeend', check);
      list.append(li);
    });
    wrap.append(btn, list);
    select.before(wrap);
    select.classList.add('pick__native');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');

    let active = -1;
    const items = [...list.children];
    const sync = () => {
      const chosen = choices.find((o) => o.value === select.value);
      text.textContent = chosen ? chosen.textContent : (placeholder ? placeholder.textContent : 'Choose one');
      text.classList.toggle('is-empty', !chosen);
      items.forEach((li) => li.setAttribute('aria-selected', li.dataset.value === select.value));
    };
    const highlight = (i) => {
      active = Math.max(0, Math.min(items.length - 1, i));
      items.forEach((li, j) => li.classList.toggle('is-active', j === active));
      list.setAttribute('aria-activedescendant', items[active].id);
      items[active].scrollIntoView({ block: 'nearest' });
    };
    const open = () => {
      all.forEach((p) => p !== api && p.close());
      list.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      wrap.classList.remove('is-invalid');
      const cur = items.findIndex((li) => li.dataset.value === select.value);
      highlight(cur >= 0 ? cur : 0);
      list.focus();
    };
    const close = (focusBtn) => {
      if (list.hidden) return;
      list.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (focusBtn) btn.focus();
    };
    const choose = (i) => {
      select.value = items[i].dataset.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
      close(true);
    };

    btn.addEventListener('click', () => (list.hidden ? open() : close(true)));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
    });
    list.addEventListener('click', (e) => {
      e.preventDefault(); // the menu sits inside a <label>; don't let it re-click the button
      const li = e.target.closest('li');
      if (li) choose(items.indexOf(li));
    });
    list.addEventListener('pointermove', (e) => {
      const li = e.target.closest('li');
      if (li) highlight(items.indexOf(li));
    });
    list.addEventListener('keydown', (e) => {
      const keys = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: items.length - 1 };
      if (e.key in keys) { e.preventDefault(); highlight(keys[e.key]); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') close(false);
      else if (e.key.length === 1) {
        // Type a letter to jump to the first choice starting with it.
        const start = items.findIndex((li, j) => j > active && li.textContent.toLowerCase().startsWith(e.key.toLowerCase()));
        const any = items.findIndex((li) => li.textContent.toLowerCase().startsWith(e.key.toLowerCase()));
        if (start >= 0 || any >= 0) highlight(start >= 0 ? start : any);
      }
    });

    // The hidden <select> is still "required": if the form is sent without a
    // choice, point at the drop-down instead of the invisible field.
    select.addEventListener('invalid', (e) => {
      e.preventDefault();
      wrap.classList.add('is-invalid');
      btn.focus();
    });
    select.form?.addEventListener('reset', () => setTimeout(sync));
    select.addEventListener('change', sync);

    const api = { close: () => close(false), wrap };
    all.push(api);
    sync();
  }

  document.addEventListener('click', (e) => {
    all.forEach((p) => { if (!p.wrap.contains(e.target)) p.close(); });
  });

  document.querySelectorAll('.book select').forEach(enhance);
})();
