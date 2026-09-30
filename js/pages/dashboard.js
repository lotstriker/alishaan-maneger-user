/* ============================================================
   ALISHAN · DASHBOARD (full)
   Greeting + 4 cards + filter/sort + Add Quality + list.
   P0-01: colour-specific size wired.
   P0-02: colours persisted on edit.
   P1-01: price snapshot preserved.
   P1-02: status toggle in edit.
   P1-07: date-range filter.
   P2-25: search analytics captured.
   P1-03: edit history also written to dedicated store.
   ============================================================ */

const DashboardPage = (() => {

  function recordsForCurrentUser() {
    const s = Store.get();
    const uid = s.session?.userId;
    if (!uid) return [];
    if (s.session.role === 'Manager') {
      return (s._records || []).filter(r => !r.archived);
    }
    return (s._records || []).filter(r => r.ownerId === uid && !r.archived);
  }

  function filterRecords(records) {
    const s = Store.get();
    let rs = records.slice();

    const q = Utils.normalize(s.ui.search);
    if (q) {
      rs = rs.filter(r => {
        const hay = [
          r.id, r.quality, r.type, r.cup, r.lot, r.notes, r.maalGaya,
          r.weight, r.meter, ...(r.colors || []),
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }

    const f = s.ui.filters || {};
    if (f.status) rs = rs.filter(r => r.status === f.status);
    if (f.type)   rs = rs.filter(r => r.type === f.type);
    if (f.color)  rs = rs.filter(r => (r.colors || []).includes(f.color));
    if (f.payment) rs = rs.filter(r => Calc.paymentStatus(r, s._payments || []) === f.payment);
    if (f.pending) rs = rs.filter(r => Calc.pendingAmount(r, s._payments || []) > 0);
    if (f.incomplete) rs = rs.filter(r => r.status === 'INCOMPLETE');
    if (f.aging)  rs = rs.filter(r => Calc.isAging(r));
    if (f.added) {
      const days = s.prefs.period === 'monthly' ? 31 : 7;
      rs = rs.filter(r => Utils.daysBetween(r.createdAt) < days);
    }
    if (f.dateFrom) rs = rs.filter(r => r.entryDate >= f.dateFrom);
    if (f.dateTo)   rs = rs.filter(r => r.entryDate <= f.dateTo);

    const sort = s.ui.sort || s.prefs.defaultSort || 'newest';
    rs.sort((a, b) => {
      if (sort === 'oldest') return new Date(a.entryDate) - new Date(b.entryDate);
      if (sort === 'alpha')  return a.quality.localeCompare(b.quality);
      if (sort === 'dozen')  return Calc.compute(b).totalDozen - Calc.compute(a).totalDozen;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return rs;
  }

  function overviewNumbers(records) {
    const s = Store.get();
    const payments = s._payments || [];
    const incomplete = records.filter(r => r.status === 'INCOMPLETE').length;
    const pending = records.reduce((a, r) => a + Calc.pendingAmount(r, payments), 0);
    const aging = records.filter(r => Calc.isAging(r)).length;
    const periodDays = s.prefs.period === 'monthly' ? 31 : 7;
    const added = records.filter(r => Utils.daysBetween(r.createdAt) < periodDays).length;
    return { incomplete, pending, aging, added, periodDays };
  }

  function render() {
    const s = Store.get();
    const user = s.session || { name: 'User', role: 'User' };
    const isManager = user.role === 'Manager';
    const myRecords = recordsForCurrentUser();
    const filtered = filterRecords(myRecords);
    const o = overviewNumbers(myRecords);

    return `
      <div class="app-shell">
        ${TopBar(user, s)}
        <main class="page-content">
          <div class="page-head">
            <div>
              <div class="eyebrow">${isManager ? 'Manager app · home' : 'User app · home'}</div>
              <h1>${Utils.esc(Utils.getGreeting())}, ${Utils.esc(user.name.split(' ')[0])}</h1>
              <p class="muted">${isManager
                ? 'Overview across every user · view-only'
                : 'Your cutting work, payments and stock in one place.'}</p>
            </div>
            <button class="btn" data-action="sync">↻ Sync now</button>
          </div>

          ${!isManager ? `
            <div class="overview-grid">
              ${StatBox.overview({
                label: 'Incomplete', value: o.incomplete, icon: '◷',
                key: 'incomplete', selected: !!s.ui.filters.incomplete,
              })}
              ${StatBox.overview({
                label: `Added This ${o.periodDays === 31 ? 'Month' : 'Week'}`,
                value: o.added, icon: '＋',
                key: 'added', selected: !!s.ui.filters.added,
              })}
              ${StatBox.overview({
                label: 'Pending Amount', value: Utils.money(o.pending), icon: '₹',
                key: 'pending', selected: !!s.ui.filters.pending,
              })}
              ${StatBox.overview({
                label: 'Aging Stock', value: o.aging, icon: '⌛',
                key: 'aging', selected: !!s.ui.filters.aging,
              })}
            </div>
          ` : `
            <div class="notice" style="margin-bottom:16px;">
              Manager view: combined across all users.
            </div>
            <div class="overview-grid">
              ${StatBox.overview({ label: 'Incomplete', value: o.incomplete, icon: '◷', key: 'incomplete' })}
              ${StatBox.overview({ label: `Added This ${o.periodDays === 31 ? 'Month' : 'Week'}`, value: o.added, icon: '＋', key: 'added' })}
              ${StatBox.overview({ label: 'Pending Amount', value: Utils.money(o.pending), icon: '₹', key: 'pending' })}
              ${StatBox.overview({ label: 'Aging Stock', value: o.aging, icon: '⌛', key: 'aging' })}
            </div>
          `}

          ${filterBar(s)}

          ${!isManager ? addForm(s) : ''}

          <div class="section-title" style="margin-top:26px;">
            <div>
              <h2>${isManager ? 'All records' : 'Latest qualities'}</h2>
              <p class="muted">${filtered.length} record${filtered.length === 1 ? '' : 's'} · tap to expand</p>
            </div>
          </div>

          ${renderList(filtered, s, { showOwner: isManager, isManagerView: isManager })}
        </main>
      </div>
    `;
  }

  function TopBar(user, s) {
    const st = Sync.status();
    const syncText = st.label;
    const dotColor = Sync.statusColor(st.state);

    return `
      <header class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <div class="brand-mark">✂</div>
            <div>
              <div class="brand-name">ALISHAN</div>
              <div class="brand-sub">cutting &amp; inventory</div>
            </div>
          </div>
          <nav class="nav">
            ${['dashboard','inventory','reports','settings'].map(p => {
              const label = { dashboard:'⌂ Home', inventory:'▦ Inventory', reports:'▥ Reports', settings:'⚙ Settings' }[p];
              const active = s.route === p;
              return `<button class="${active ? 'active' : ''}" data-nav="${p}">${label}</button>`;
            }).join('')}
          </nav>
          <button class="sync" data-action="sync">
            <i class="sync-dot" style="background:${dotColor};"></i>${syncText}
          </button>
          <div class="user-menu">
            <div class="avatar">${Utils.esc(Utils.initials(user.name))}</div>
            <span class="name">${Utils.esc(user.name)}</span>
          </div>
        </div>
      </header>
    `;
  }

  function filterBar(s) {
    const chips = Object.entries(s.ui.filters || {}).map(([k, v]) => {
      const label = v === 'INCOMPLETE' ? 'Incomplete'
                  : v === true ? k.charAt(0).toUpperCase() + k.slice(1)
                  : (k === 'dateFrom' ? `From ${v}` : k === 'dateTo' ? `To ${v}` : v);
      return `<button class="chip active" data-remove-filter="${Utils.esc(k)}">
        ${Utils.esc(label)} <span class="x">×</span>
      </button>`;
    }).join('');

    return `
      <div class="toolbar">
        <div class="search">
          <span class="icon">⌕</span>
          <input id="global-search" value="${Utils.esc(s.ui.search)}"
                 placeholder="Search quality, lot, colour, ID, notes…" />
        </div>
        <button class="btn" data-action="open-filter">⚙ Filter</button>
        <select class="btn" id="sort-select">
          <option value="newest" ${s.ui.sort === 'newest' ? 'selected' : ''}>Newest first</option>
          <option value="oldest" ${s.ui.sort === 'oldest' ? 'selected' : ''}>Oldest first</option>
          <option value="alpha"  ${s.ui.sort === 'alpha'  ? 'selected' : ''}>A–Z</option>
          <option value="dozen"  ${s.ui.sort === 'dozen'  ? 'selected' : ''}>Dozen high→low</option>
        </select>
        <button class="btn" data-action="reset-filters">↺ Reset</button>
      </div>
      ${chips ? `<div class="filter-row">${chips}</div>` : ''}
      ${s.ui.showFilterPanel ? filterPanel(s) : ''}
    `;
  }

  function filterPanel(s) {
    const colors = MasterData.getApprovedColors();
    const f = s.ui.filters || {};
    return `
      <div class="card panel" style="box-shadow:none;margin-bottom:14px;">
        <div class="section-title">
          <h3>Filters</h3>
          <button class="btn small" data-action="close-filter">Close</button>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="filter-status">Status</label>
            <select id="filter-status">
              <option value="">All</option>
              <option value="INCOMPLETE" ${f.status === 'INCOMPLETE' ? 'selected' : ''}>Incomplete</option>
              <option value="COMPLETED"  ${f.status === 'COMPLETED'  ? 'selected' : ''}>Completed</option>
            </select>
          </div>
          <div class="field">
            <label for="filter-type">Quality Type</label>
            <select id="filter-type">
              <option value="">All</option>
              ${['Bra','Panty','Set','Blouse'].map(t => `<option ${f.type === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="filter-color">Colour</label>
            <select id="filter-color">
              <option value="">All</option>
              ${colors.map(c => `<option value="${Utils.esc(c.name)}" ${f.color === c.name ? 'selected' : ''}>${Utils.esc(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="filter-payment">Payment Status</label>
            <select id="filter-payment">
              <option value="">All</option>
              <option value="paid"    ${f.payment === 'paid'    ? 'selected' : ''}>Paid</option>
              <option value="partial" ${f.payment === 'partial' ? 'selected' : ''}>Partial</option>
              <option value="unpaid"  ${f.payment === 'unpaid'  ? 'selected' : ''}>Unpaid</option>
              <option value="na"      ${f.payment === 'na'      ? 'selected' : ''}>N/A</option>
            </select>
          </div>
          <div class="field">
            <label for="filter-date-from">Entry date from</label>
            <input id="filter-date-from" type="date" value="${Utils.esc(f.dateFrom || '')}" />
          </div>
          <div class="field">
            <label for="filter-date-to">Entry date to</label>
            <input id="filter-date-to" type="date" value="${Utils.esc(f.dateTo || '')}" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn primary" data-action="apply-filter">Apply filters</button>
        </div>
      </div>
    `;
  }

  function addForm(s) {
    const f = s.ui.addForm || ensureAddForm();
    const master = MasterData.getApprovedQualities(f.type);
    const selectedQuality = master.find(q => q.name === f.quality);
    const rate = selectedQuality?.price || 0;

    const qualityOptions = master.filter(q =>
      !f.quality || Utils.normalize(q.name).includes(Utils.normalize(f.quality))
    );

    const total = computeLiveTotal(f, rate);

    return `
      <section class="card form-card">
        <div class="section-title">
          <div>
            <h2>＋ Add quality</h2>
            <p class="muted">New records save offline immediately and start as Incomplete.</p>
          </div>
          <span class="badge incomplete">Status: Incomplete</span>
        </div>

        <div class="form-grid">
          <div class="field full">
            <label>Quality type</label>
            <div class="choice-row" role="group" aria-label="Quality type">
              ${['Bra','Panty','Set','Blouse'].map(t => `
                <button type="button" class="choice ${f.type === t ? 'active' : ''}"
                        data-form-type="${t}">${t}</button>
              `).join('')}
            </div>
          </div>

          <div class="field">
            <label for="form-quality">Quality</label>
            <input id="form-quality" list="quality-options"
                   value="${Utils.esc(f.quality)}" placeholder="Search quality…" />
            <datalist id="quality-options">
              ${qualityOptions.map(q => `<option value="${Utils.esc(q.name)}">${Utils.money(q.price)}/dozen</option>`).join('')}
            </datalist>
            <div class="hint">
              ${selectedQuality
                ? `${Utils.money(selectedQuality.price)}/dozen (auto)`
                : 'Approved master entries only.'}
            </div>
          </div>

          <div class="field">
            <label>Cup</label>
            <div class="choice-row" role="group" aria-label="Cup">
              ${['A','B','C','D','E','F'].map(x => `
                <button type="button" class="choice ${f.cup === x ? 'active' : ''}"
                        data-form-cup="${x}">${x}</button>
              `).join('')}
            </div>
          </div>

          <div class="full">
            <details class="accordion">
              <summary>
                ＋ Weight / meter (optional)
                ${f.weight || f.meter ? `· ${Utils.esc(f.weight || '—')} kg, ${Utils.esc(f.meter || '—')} m` : ''}
              </summary>
              <div class="accordion-content">
                <div class="form-grid">
                  <div class="field">
                    <label for="form-weight">Weight (kg)</label>
                    <input id="form-weight" type="number" min="0" step="0.01" value="${Utils.esc(f.weight)}" />
                  </div>
                  <div class="field">
                    <label for="form-meter">Meter</label>
                    <input id="form-meter" type="number" min="0" step="0.01" value="${Utils.esc(f.meter)}" />
                  </div>
                </div>
              </div>
            </details>
          </div>

          ${ColorPicker.render(MasterData.getApprovedColors(), f.colors, s.ui.colorSearch || '')}

          <div class="field full">
            <label>Quantity mode</label>
            <div class="segmented" role="group" aria-label="Quantity mode">
              <button type="button" class="${f.mode === 'same' ? 'active' : ''}"
                      data-form-mode="same">Same for all colours</button>
              <button type="button" class="${f.mode === 'different' ? 'active' : ''}"
                      data-form-mode="different">Different by colour</button>
            </div>
          </div>

          <div class="field full">
            <label>Size quantities · live total</label>
            <div class="live-total">
              <span>Total: ${Utils.dozen(total.totalDozen)} dozen</span>
              <span>${Utils.money(total.amount)}</span>
            </div>
            ${f.mode === 'different'
              ? (f.colors.length
                  ? f.colors.map(c => renderPerColorGrid(f, c, rate)).join('')
                  : `<span class="hint">Select at least one colour first.</span>`)
              : renderSharedGrid(f, rate)}
          </div>

          <div class="full">
            <details class="accordion">
              <summary>
                ＋ Notes &amp; entry date (optional)
                ${f.notes || f.entryDate !== Utils.todayISO() ? `· ${Utils.esc(f.entryDate)}` : ''}
              </summary>
              <div class="accordion-content">
                <div class="form-grid">
                  <div class="field full">
                    <label for="form-notes">Notes</label>
                    <textarea id="form-notes" placeholder="Add a note…">${Utils.esc(f.notes)}</textarea>
                  </div>
                  <div class="field">
                    <label for="form-date">Entry date</label>
                    <input id="form-date" type="date" max="${Utils.todayISO()}" value="${Utils.esc(f.entryDate)}" />
                  </div>
                  ${f.entryDate !== Utils.todayISO() ? `
                    <div class="field">
                      <label>Track payment for this entry?</label>
                      <div class="segmented">
                        <button type="button" class="${f.paymentTracked ? 'active' : ''}"
                                data-form-payment="true">Yes</button>
                        <button type="button" class="${!f.paymentTracked ? 'active' : ''}"
                                data-form-payment="false">No</button>
                      </div>
                      <div class="hint">Historical entries with tracking off stay out of cash-flow totals.</div>
                    </div>
                  ` : ''}
                </div>
              </div>
            </details>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn" data-action="clear-form">Clear</button>
          <button class="btn primary" data-action="save-record">Save · Status: Incomplete</button>
        </div>
      </section>
    `;
  }

  function computeLiveTotal(f, rate) {
    if (f.mode === 'different') {
      let totalDozen = 0, amount = 0;
      for (const c of f.colors) {
        const q = f.quantitiesByColor?.[c] || Calc.emptyQuantities();
        const sub = Calc.computeForQuantities(q, rate);
        totalDozen += sub.totalDozen;
        amount += sub.amount;
      }
      return { totalDozen, amount };
    }
    return Calc.computeForQuantities(f.quantities, rate);
  }

  function renderSharedGrid(f, rate) {
    const g = SizeGrid.renderEditableHybrid({
      quantities: f.quantities,
      openSizes: f.openSizes,
      rate,
    });
    return g.chipsHtml + g.inputsHtml;
  }

  function renderPerColorGrid(f, color, rate) {
    const q = f.quantitiesByColor?.[color] || Calc.emptyQuantities();
    const openSizes = (f.openSizesByColor && f.openSizesByColor[color]) || [];
    const g = SizeGrid.renderEditableHybrid({
      quantities: q, openSizes, rate, color,
    });
    const sub = Calc.computeForQuantities(q, rate);
    return `
      <div class="color-group">
        <div class="color-group-head">
          ${StatBox.render([
            { value: Utils.esc(color), label: 'colour' },
            { value: Utils.dozen(sub.totalDozen), label: 'dozen' },
            { value: Utils.money(sub.amount), label: 'value', tone: 'accent' },
          ])}
        </div>
        ${g.chipsHtml}
        ${g.inputsHtml}
      </div>
    `;
  }

  function renderList(records, s, opts = {}) {
    const PER = 5;
    const total = Math.max(1, Math.ceil(records.length / PER));
    const page = Math.min(s.ui.page, total);
    const slice = records.slice((page - 1) * PER, page * PER);

    if (!slice.length) {
      return `<div class="card empty">
        No records match the current view.<br />
        <button class="btn small" data-action="reset-filters" style="margin-top:10px;">Reset filters</button>
      </div>`;
    }

    const cards = slice.map(r => {
      const expanded = s.ui.expandedId === r.id;
      const editing  = s.ui.editingId === r.id;
      const collapsed = RecordCard.renderCollapsed(r, {
        selectable: s.ui.selectMode,
        selected: (s.ui.selectedIds || []).includes(r.id),
        showOwner: opts.showOwner,
      });
      if (!expanded) return collapsed;

      const inner = editing && s.ui.editDraft
        ? RecordCard.renderEdit(r, s.ui.editDraft)
        : RecordCard.renderDetail(r, s._payments || [], { isManagerView: opts.isManagerView });

      return collapsed.replace('</article>', inner + '</article>');
    }).join('');

    return `
      <div class="record-list">${cards}</div>
      ${total > 1 ? `
        <div class="pagination">
          ${Array.from({ length: total }, (_, i) => `
            <button class="${page === i + 1 ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  function ensureAddForm() {
    const s = Store.get();
    if (s.ui.addForm) return s.ui.addForm;
    const blank = {
      type: 'Bra', quality: '', cup: 'A', weight: '', meter: '',
      colors: [], mode: s.prefs.defaultMode || 'same',
      openSizes: [], openSizesByColor: {},
      quantities: Calc.emptyQuantities(),
      quantitiesByColor: {},
      notes: '', entryDate: Utils.todayISO(), paymentTracked: true,
    };
    Store.set({ ui: { addForm: blank } });
    return blank;
  }

  function updateFormInputs(root) {
    const s = Store.get();
    const f = s.ui.addForm;
    if (!f) return;

    ['quality','weight','meter','notes','date'].forEach(k => {
      const el = Utils.$('#form-' + k, root);
      if (!el) return;
      const key = k === 'date' ? 'entryDate' : k;
      f[key] = el.value;
    });

    Utils.$$('[data-size-dozens]', root).forEach(el => {
      const sz = el.dataset.sizeDozens;
      if (!f.quantities[sz]) f.quantities[sz] = { dozens: 0, pieces: 0 };
      f.quantities[sz].dozens = Math.max(0, Number(el.value || 0));
    });
    Utils.$$('[data-size-pieces]', root).forEach(el => {
      const sz = el.dataset.sizePieces;
      if (!f.quantities[sz]) f.quantities[sz] = { dozens: 0, pieces: 0 };
      f.quantities[sz].pieces = Math.min(11, Math.max(0, Number(el.value || 0)));
    });

    if (!f.quantitiesByColor) f.quantitiesByColor = {};
    Utils.$$('[data-color-dozens]', root).forEach(el => {
      const [c, sz] = el.dataset.colorDozens.split('::');
      if (!f.quantitiesByColor[c]) f.quantitiesByColor[c] = Calc.emptyQuantities();
      f.quantitiesByColor[c][sz].dozens = Math.max(0, Number(el.value || 0));
    });
    Utils.$$('[data-color-pieces]', root).forEach(el => {
      const [c, sz] = el.dataset.colorPieces.split('::');
      if (!f.quantitiesByColor[c]) f.quantitiesByColor[c] = Calc.emptyQuantities();
      f.quantitiesByColor[c][sz].pieces = Math.min(11, Math.max(0, Number(el.value || 0)));
    });

    f.colors.forEach(c => {
      if (!f.quantitiesByColor[c]) f.quantitiesByColor[c] = Calc.emptyQuantities();
    });
  }

  function mount(root) {
    Utils.$$('[data-nav]', root).forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.nav;
      if (p === 'dashboard') return;
      Router.go(p);
    }));

    Utils.$$('[data-action="sync"]', root).forEach(b => b.addEventListener('click', () => {
      Sync.triggerSync();
    }));

    Utils.$$('[data-expand]', root).forEach(h => h.addEventListener('click', e => {
      if (e.target.closest('input,button,select')) return;
      const id = h.dataset.expand;
      const s = Store.get();
      const same = s.ui.expandedId === id;
      Store.set({ ui: { expandedId: same ? null : id, editingId: null, editDraft: null }});
    }));

    Utils.$$('[data-card]', root).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.card;
      const s = Store.get();
      const next = { ...s.ui.filters };
      if (k === 'incomplete') next.incomplete = !next.incomplete;
      else if (k === 'aging')      next.aging      = !next.aging;
      else if (k === 'pending')    next.pending    = !next.pending;
      else if (k === 'added')      next.added      = !next.added;
      Store.set({ ui: { filters: next, page: 1 }});
    }));

    Utils.$$('[data-remove-filter]', root).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.removeFilter;
      const s = Store.get();
      const next = { ...s.ui.filters };
      delete next[k];
      Store.set({ ui: { filters: next, page: 1 }});
    }));

    Utils.$$('[data-action="open-filter"]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: { showFilterPanel: true }})));
    Utils.$$('[data-action="close-filter"]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: { showFilterPanel: false }})));
    Utils.$$('[data-action="apply-filter"]', root).forEach(b =>
      b.addEventListener('click', () => {
        const f = {};
        const status = Utils.$('#filter-status', root)?.value;
        const type   = Utils.$('#filter-type', root)?.value;
        const color  = Utils.$('#filter-color', root)?.value;
        const payment= Utils.$('#filter-payment', root)?.value;
        const dateFrom = Utils.$('#filter-date-from', root)?.value;
        const dateTo   = Utils.$('#filter-date-to', root)?.value;
        if (status)   f.status = status;
        if (type)     f.type = type;
        if (color)    f.color = color;
        if (payment)  f.payment = payment;
        if (dateFrom) f.dateFrom = dateFrom;
        if (dateTo)   f.dateTo = dateTo;
        Store.set({ ui: { filters: f, page: 1, showFilterPanel: false }});
      }));

    Utils.$$('[data-action="reset-filters"]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: {
        filters: {}, search: '', sort: 'newest', page: 1, showFilterPanel: false,
      }})));

    const search = Utils.$('#global-search', root);
    if (search) search.addEventListener('input', Utils.debounce(e => {
      const q = e.target.value;
      Store.set({ ui: { search: q, page: 1 }});
      captureSearch(q);
      const el = Utils.$('#global-search');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 250));

    const sortSel = Utils.$('#sort-select', root);
    if (sortSel) sortSel.addEventListener('change', e =>
      Store.set({ ui: { sort: e.target.value, page: 1 }}));

    Utils.$$('[data-page]', root).forEach(b => b.addEventListener('click', () =>
      Store.set({ ui: { page: Number(b.dataset.page) }})));

    Utils.$$('[data-form-type]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      updateFormInputs(root);
      Store.set({ ui: { addForm: { ...s.ui.addForm, type: b.dataset.formType, quality: '' }}});
    }));

    Utils.$$('[data-form-cup]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      updateFormInputs(root);
      Store.set({ ui: { addForm: { ...s.ui.addForm, cup: b.dataset.formCup }}});
    }));

    Utils.$$('[data-form-color]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      updateFormInputs(root);
      const f = s.ui.addForm;
      const name = b.dataset.formColor;
      const colors = f.colors.includes(name)
        ? f.colors.filter(x => x !== name)
        : [...f.colors, name];
      const byColor = { ...(f.quantitiesByColor || {}) };
      if (!byColor[name]) byColor[name] = Calc.emptyQuantities();
      const openByColor = { ...(f.openSizesByColor || {}) };
      if (!openByColor[name]) openByColor[name] = [];
      Store.set({ ui: { addForm: { ...f, colors, quantitiesByColor: byColor, openSizesByColor: openByColor }}});
    }));

    Utils.$$('[data-form-mode]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      updateFormInputs(root);
      Store.set({ ui: { addForm: { ...s.ui.addForm, mode: b.dataset.formMode }}});
    }));

    Utils.$$('[data-form-payment]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      updateFormInputs(root);
      Store.set({ ui: { addForm: { ...s.ui.addForm, paymentTracked: b.dataset.formPayment === 'true' }}});
    }));

    Utils.$$('[data-form-size]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      updateFormInputs(root);
      const f = s.ui.addForm;
      const n = Number(b.dataset.formSize);
      const openSizes = f.openSizes.includes(n)
        ? f.openSizes.filter(x => x !== n)
        : [...f.openSizes, n];
      Store.set({ ui: { addForm: { ...f, openSizes }}});
    }));

    /* P0-01 FIX: colour-specific size chip toggle */
    Utils.$$('[data-color-size]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      updateFormInputs(root);
      const f = s.ui.addForm;
      const [color, sizeStr] = b.dataset.colorSize.split('::');
      const sz = Number(sizeStr);
      const openByColor = { ...(f.openSizesByColor || {}) };
      if (!openByColor[color]) openByColor[color] = [];
      const cur = openByColor[color];
      openByColor[color] = cur.includes(sz) ? cur.filter(x => x !== sz) : [...cur, sz];
      Store.set({ ui: { addForm: { ...f, openSizesByColor: openByColor }}});
    }));

    Utils.$$('[data-size-dozens],[data-size-pieces],[data-color-dozens],[data-color-pieces]', root).forEach(el =>
      el.addEventListener('change', () => { updateFormInputs(root); Store.set({ ui: { addForm: { ...Store.get().ui.addForm } } }); }));

    const formQuality = Utils.$('#form-quality', root);
    if (formQuality) formQuality.addEventListener('input', e => {
      const s = Store.get();
      Store.set({ ui: { addForm: { ...s.ui.addForm, quality: e.target.value }}});
    });

    const colorSearch = Utils.$('#color-search', root);
    if (colorSearch) colorSearch.addEventListener('input', Utils.debounce(e => {
      Store.set({ ui: { colorSearch: e.target.value }});
    }, 150));

    ['weight','meter','notes','date'].forEach(k => {
      const el = Utils.$('#form-' + k, root);
      if (!el) return;
      el.addEventListener('input', () => {
        const s = Store.get();
        const key = k === 'date' ? 'entryDate' : k;
        Store.set({ ui: { addForm: { ...s.ui.addForm, [key]: el.value }}});
      });
    });

    Utils.$$('[data-action="save-record"]', root).forEach(b =>
      b.addEventListener('click', () => saveRecord(root)));

    Utils.$$('[data-action="clear-form"]', root).forEach(b =>
      b.addEventListener('click', () => {
        Store.set({ ui: { addForm: null }});
        ensureAddForm();
        Router.render();
      }));

    Utils.$$('[data-action="edit"]', root).forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id;
      const s = Store.get();
      const rec = (s._records || []).find(r => r.id === id);
      if (!rec) return;
      const draft = {
        quality: rec.quality, cup: rec.cup, lot: rec.lot || '', maalGaya: rec.maalGaya || '',
        weight: rec.weight || '', meter: rec.meter || '', notes: rec.notes || '',
        mode: rec.mode, colors: rec.colors.slice(),
        quantities: Utils.deepClone(rec.quantities || Calc.emptyQuantities()),
        quantitiesByColor: Utils.deepClone(rec.quantitiesByColor || {}),
        priceSnapshot: rec.priceSnapshot,
        status: rec.status,
      };
      Store.set({ ui: { editingId: id, editDraft: draft }});
    }));

    Utils.$$('[data-action="cancel-edit"]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: { editingId: null, editDraft: null }})));

    Utils.$$('[data-edit-cup]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      Store.set({ ui: { editDraft: { ...s.ui.editDraft, cup: b.dataset.editCup }}});
    }));

    Utils.$$('[data-edit-status]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      Store.set({ ui: { editDraft: { ...s.ui.editDraft, status: b.dataset.editStatus }}});
    }));

    Utils.$$('[data-edit-mode]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      const mode = b.dataset.editMode;
      const draft = s.ui.editDraft;
      if (mode === 'different' && draft.mode === 'same') {
        const byColor = { ...(draft.quantitiesByColor || {}) };
        draft.colors.forEach(c => { byColor[c] = byColor[c] || Utils.deepClone(draft.quantities); });
        Store.set({ ui: { editDraft: { ...draft, mode: 'different', quantitiesByColor: byColor }}});
      } else if (mode === 'same' && draft.mode === 'different') {
        Modal.open({
          title: 'Convert to Same for all colours?',
          text: 'Choose which colour becomes the shared baseline.',
          body: `<div class="field"><label for="baseline-color">Shared baseline colour</label>
                 <select id="baseline-color">
                   ${draft.colors.map(c => `<option>${Utils.esc(c)}</option>`).join('')}
                 </select></div>`,
          confirmLabel: 'Convert quantity',
          onConfirm: (modal) => {
            const baseline = modal.querySelector('#baseline-color').value;
            const q = Utils.deepClone(draft.quantitiesByColor?.[baseline] || draft.quantities);
            Store.set({ ui: { editDraft: { ...draft, mode: 'same', quantities: q }}});
          },
        });
      } else {
        Store.set({ ui: { editDraft: { ...draft, mode }}});
      }
    }));

    Utils.$$('[data-edit-color]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      const draft = s.ui.editDraft;
      const name = b.dataset.editColor;
      const colors = draft.colors.includes(name)
        ? draft.colors.filter(x => x !== name)
        : [...draft.colors, name];
      const byColor = { ...(draft.quantitiesByColor || {}) };
      if (!byColor[name]) byColor[name] = Calc.emptyQuantities();
      Store.set({ ui: { editDraft: { ...draft, colors, quantitiesByColor: byColor }}});
    }));

    Utils.$$('[data-action="save-edit"]', root).forEach(b =>
      b.addEventListener('click', () => saveEdit(root, b.dataset.id)));

    Utils.$$('[data-action="add-payment"]', root).forEach(b =>
      b.addEventListener('click', () => openPaymentModal(b.dataset.id)));

    Utils.$$('[data-action="complete"]', root).forEach(b => b.addEventListener('click', async () => {
      const ok = await Modal.confirm({
        title: 'Mark as Completed?',
        text: 'This closes the record. You can still see it in the list.',
        confirmLabel: 'Mark as Completed',
      });
      if (!ok) return;
      const id = b.dataset.id;
      const rec = Store.get()._records.find(r => r.id === id);
      if (!rec) return;
      rec.status = 'COMPLETED';
      rec.lastModified = Utils.nowISO();
      await DB.put('records', rec);
      await Auth.logAudit(Store.currentUserId(), Store.get().session.name,
        'RECORD_COMPLETED', rec.id);
      await refreshData();
      Toast.success('Marked as completed.');
    }));

    Utils.$$('[data-action="archive"]', root).forEach(b => b.addEventListener('click', async () => {
      const ok = await Modal.confirm({
        title: 'Move to Archive?',
        text: 'This record can be restored from the Archive later.',
        confirmLabel: 'Move to Archive',
        danger: true,
      });
      if (!ok) return;
      const id = b.dataset.id;
      const rec = Store.get()._records.find(r => r.id === id);
      if (!rec) return;
      rec.archived = true;
      rec.archivedAt = Utils.nowISO();
      await DB.put('records', rec);
      await Auth.logAudit(Store.currentUserId(), Store.get().session.name,
        'RECORD_ARCHIVED', rec.id);
      await refreshData();
      Store.set({ ui: { expandedId: null }});
      Toast.success('Record moved to Archive.');
    }));

    Utils.$$('[data-select-id]', root).forEach(cb =>
      cb.addEventListener('change', () => {
        const s = Store.get();
        const id = cb.dataset.selectId;
        const ids = s.ui.selectedIds.includes(id)
          ? s.ui.selectedIds.filter(x => x !== id)
          : [...s.ui.selectedIds, id];
        Store.set({ ui: { selectedIds: ids }});
      }));
  }

  async function saveRecord(root) {
    updateFormInputs(root);
    const s = Store.get();
    const f = s.ui.addForm;

    const master = MasterData.findQuality(f.type, f.quality);
    if (!master || master.status !== 'APPROVED' || master.active === false) {
      return Toast.error('Select a quality from the master list.');
    }
    if (!f.cup) return Toast.error('Select a cup.');
    if (!f.colors.length) return Toast.error('Select at least one colour.');

    const groups = f.mode === 'different'
      ? f.colors.map(c => f.quantitiesByColor?.[c] || Calc.emptyQuantities())
      : [f.quantities];
    const hasQty = groups.some(g => Object.values(g).some(v => v.dozens || v.pieces));
    if (!hasQty) return Toast.error('Enter quantities for at least one size.');

    const records = s._records || [];
    const id = Utils.seqId('Q-', records.map(r => r.id));
    const record = {
      id,
      ownerId: s.session.userId,
      ownerName: s.session.name,
      type: f.type,
      quality: master.name,
      cup: f.cup,
      priceSnapshot: master.price,
      colors: f.colors.slice(),
      mode: f.mode,
      quantities: Calc.normalizeQuantities(f.quantities),
      quantitiesByColor: f.mode === 'different' ? Utils.deepClone(f.quantitiesByColor) : undefined,
      weight: f.weight, meter: f.meter,
      lot: '', maalGaya: '',
      notes: f.notes,
      entryDate: f.entryDate,
      createdAt: Utils.nowISO(),
      lastModified: Utils.nowISO(),
      status: 'INCOMPLETE',
      paymentTracked: f.entryDate === Utils.todayISO() ? true : f.paymentTracked,
      history: [],
      archived: false,
    };
    await DB.put('records', record);
    await Auth.logAudit(s.session.userId, s.session.name, 'RECORD_CREATED', `${id} · ${record.quality}`);

    await refreshData();
    Store.set({ ui: { addForm: null, expandedId: id, search: '', filters: {}, page: 1 }});
    ensureAddForm();
    Toast.success(`${id} saved offline.`);
  }

  async function saveEdit(root, id) {
    const s = Store.get();
    const rec = s._records.find(r => r.id === id);
    const draft = s.ui.editDraft;
    if (!rec || !draft) return;

    draft.quality   = Utils.$('#edit-quality', root)?.value ?? draft.quality;
    draft.lot       = Utils.$('#edit-lot', root)?.value ?? draft.lot;
    draft.maalGaya  = Utils.$('#edit-maal', root)?.value ?? draft.maalGaya;
    draft.weight    = Utils.$('#edit-weight', root)?.value ?? draft.weight;
    draft.meter     = Utils.$('#edit-meter', root)?.value ?? draft.meter;
    draft.notes     = Utils.$('#edit-notes', root)?.value ?? draft.notes;

    const readNum = el => Number(el.value || 0);
    if (draft.mode === 'different') {
      draft.quantitiesByColor = draft.quantitiesByColor || {};
      Utils.$$('[data-edit-dozens]', root).forEach(el => {
        const [c, sz] = el.dataset.editDozens.split('::');
        if (!draft.quantitiesByColor[c]) draft.quantitiesByColor[c] = Calc.emptyQuantities();
        draft.quantitiesByColor[c][sz].dozens = Math.max(0, readNum(el));
      });
      Utils.$$('[data-edit-pieces]', root).forEach(el => {
        const [c, sz] = el.dataset.editPieces.split('::');
        if (!draft.quantitiesByColor[c]) draft.quantitiesByColor[c] = Calc.emptyQuantities();
        draft.quantitiesByColor[c][sz].pieces = Math.min(11, Math.max(0, readNum(el)));
      });
    } else {
      Utils.$$('[data-edit-dozens]', root).forEach(el => {
        const sz = el.dataset.editDozens.split('::').pop();
        draft.quantities[sz] = draft.quantities[sz] || { dozens: 0, pieces: 0 };
        draft.quantities[sz].dozens = Math.max(0, readNum(el));
      });
      Utils.$$('[data-edit-pieces]', root).forEach(el => {
        const sz = el.dataset.editPieces.split('::').pop();
        draft.quantities[sz] = draft.quantities[sz] || { dozens: 0, pieces: 0 };
        draft.quantities[sz].pieces = Math.min(11, Math.max(0, readNum(el)));
      });
    }

    const master = MasterData.findQuality(rec.type, draft.quality);
    const unchanged = Utils.normalize(draft.quality) === Utils.normalize(rec.quality);
    if (!master || (!unchanged && (master.status !== 'APPROVED' || master.active === false))) {
      return Toast.error('Quality name must match the master list.');
    }
    draft.quality = master.name;
    /* P1-01: priceSnapshot NOT overwritten — existing record keeps original */

    const fields = {
      quality: draft.quality,
      cup: draft.cup,
      lot: draft.lot,
      maalGaya: draft.maalGaya,
      weight: draft.weight,
      meter: draft.meter,
      notes: draft.notes,
      mode: draft.mode,
      colors: draft.colors.slice(),          /* P0-02 fix */
      status: draft.status || rec.status,    /* P1-02 fix */
      quantities: Calc.normalizeQuantities(draft.quantities),
      quantitiesByColor: draft.mode === 'different' ? Utils.deepClone(draft.quantitiesByColor) : undefined,
    };

    const history = rec.history || [];
    const newEntries = [];
    for (const [k, v] of Object.entries(fields)) {
      const oldV = JSON.stringify(rec[k] ?? '');
      const newV = JSON.stringify(v ?? '');
      if (oldV !== newV) {
        const entry = {
          field: k, old: rec[k] ?? '', new: v ?? '',
          who: s.session.name, when: new Date().toLocaleString('en-IN'),
        };
        history.push(entry);
        newEntries.push(entry);
      }
    }
    rec.history = history;
    Object.assign(rec, fields);
    rec.lastModified = Utils.nowISO();

    await DB.put('records', rec);
    /* P1-03 fix: also write to canonical editHistory store */
    for (const e of newEntries) {
      await DB.appendHistory(rec.id, e);
    }
    await Auth.logAudit(s.session.userId, s.session.name, 'RECORD_EDITED', rec.id);
    await refreshData();
    Store.set({ ui: { editingId: null, editDraft: null }});
    Toast.success('Changes saved.');
  }

  function openPaymentModal(recordId) {
    const s = Store.get();
    const rec = s._records.find(r => r.id === recordId);
    if (!rec) return;
    const c = Calc.compute(rec);
    const received = Calc.totalReceived(rec, s._payments || []);
    const pending = Math.max(0, c.amount - received);

    Modal.open({
      title: `Add payment · ${rec.id}`,
      text: `Pending: ${Utils.money(pending)}`,
      body: `
        <div class="field">
          <label for="pay-amount">Amount (₹)</label>
          <input id="pay-amount" type="number" min="0.01" max="${pending}" step="0.01" value="${pending}" />
        </div>
        <div class="field" style="margin-top:12px">
          <label for="pay-method">Method</label>
          <select id="pay-method">
            <option>Cash</option><option>UPI</option>
            <option>Bank Transfer</option><option>Other</option>
          </select>
        </div>
        <div class="field" style="margin-top:12px">
          <label for="pay-note">Note (optional)</label>
          <input id="pay-note" />
        </div>
      `,
      confirmLabel: 'Save payment',
      onConfirm: async (modal) => {
        const amount = Number(modal.querySelector('#pay-amount').value || 0);
        if (!amount || amount <= 0) { Toast.error('Enter a valid amount.'); return false; }
        if (amount > pending + 0.005) { Toast.error('Pending amount se zyada nahi de sakte.'); return false; }
        const payment = {
          id: Utils.uid('P'),
          recordId: rec.id,
          amount,
          date: Utils.todayISO(),
          method: modal.querySelector('#pay-method').value,
          note: modal.querySelector('#pay-note').value || '',
          createdBy: s.session.userId,
          createdAt: Utils.nowISO(),
          archived: false,
        };
        await DB.put('payments', payment);
        await Auth.logAudit(s.session.userId, s.session.name, 'PAYMENT_ADDED',
          `${rec.id} · ${Utils.money(amount)}`);
        await refreshData();
        Toast.success('Payment added.');
        return true;
      },
    });
  }

  async function captureSearch(query) {
    const q = Utils.normalize(query);
    if (!q || q.length < 3) return;
    try {
      const existing = (Store.get()._searchAnalytics || [])
        .find(x => x.query === q && x.userId === Store.currentUserId());
      if (existing) {
        existing.count = (existing.count || 1) + 1;
        existing.lastSearched = Utils.nowISO();
        await DB.put('searchAnalytics', existing);
      } else {
        const entry = {
          id: Utils.uid('S'),
          query: q,
          count: 1,
          userId: Store.currentUserId(),
          lastSearched: Utils.nowISO(),
        };
        await DB.put('searchAnalytics', entry);
        const cur = Store.get()._searchAnalytics || [];
        Store.set({ _searchAnalytics: [...cur, entry] });
      }
    } catch (_) { /* silent */ }
  }

  async function refreshData() {
    const records  = await DB.getAll('records');
    const payments = await DB.getAll('payments');
    Store.set({ _records: records, _payments: payments });
  }

  return { render, mount, refreshData, updateFormInputs };
})();

window.DashboardPage = DashboardPage;