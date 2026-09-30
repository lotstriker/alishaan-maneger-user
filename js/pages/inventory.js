/* ============================================================
   ALISHAN · INVENTORY PAGE
   6 overview cards, Group By, Select mode, pagination.
   ============================================================ */

const InventoryPage = (() => {

  function recordsForCurrentUser() {
    const s = Store.get();
    const uid = s.session?.userId;
    if (!uid) return [];
    if (s.session.role === 'Manager') {
      return (s._records || []).filter(r => !r.archived);
    }
    return (s._records || []).filter(r => r.ownerId === uid && !r.archived);
  }

  function filteredRecords() {
    const s = Store.get();
    let rs = recordsForCurrentUser();

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
    if (f.status)     rs = rs.filter(r => r.status === f.status);
    if (f.type)       rs = rs.filter(r => r.type === f.type);
    if (f.color)      rs = rs.filter(r => (r.colors || []).includes(f.color));
    if (f.payment)    rs = rs.filter(r => Calc.paymentStatus(r, s._payments || []) === f.payment);
    if (f.pending)    rs = rs.filter(r => Calc.pendingAmount(r, s._payments || []) > 0);
    if (f.incomplete) rs = rs.filter(r => r.status === 'INCOMPLETE');
    if (f.aging)      rs = rs.filter(r => Calc.isAging(r));
    if (f.added) {
      const days = s.prefs.period === 'monthly' ? 31 : 7;
      rs = rs.filter(r => Utils.daysBetween(r.createdAt) < days);
    }
    if (f.dateFrom) rs = rs.filter(r => r.entryDate >= f.dateFrom);
    if (f.dateTo)   rs = rs.filter(r => r.entryDate <= f.dateTo);

    const sort = s.ui.sort || 'newest';
    rs.sort((a, b) => {
      if (sort === 'oldest') return new Date(a.entryDate) - new Date(b.entryDate);
      if (sort === 'alpha')  return a.quality.localeCompare(b.quality);
      if (sort === 'dozen')  return Calc.compute(b).totalDozen - Calc.compute(a).totalDozen;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return rs;
  }

  function overviewNumbers() {
    const all = recordsForCurrentUser();
    const s = Store.get();
    const payments = s._payments || [];
    const totalValue = all.reduce((a, r) => a + Calc.compute(r).amount, 0);
    const incomplete = all.filter(r => r.status === 'INCOMPLETE').length;
    const aging = all.filter(r => Calc.isAging(r)).length;
    const pending = all.reduce((a, r) => a + Calc.pendingAmount(r, payments), 0);
    const periodDays = s.prefs.period === 'monthly' ? 31 : 7;
    const added = all.filter(r => Utils.daysBetween(r.createdAt) < periodDays).length;
    return { totalItems: all.length, totalValue, incomplete, aging, pending, added, periodDays };
  }

  function render() {
    const s = Store.get();
    const user = s.session || { name: 'User', role: 'User' };
    const isManager = user.role === 'Manager';

    const filtered = filteredRecords();
    const o = overviewNumbers();
    const grouped = s.ui.groupBy;

    return `
      <div class="app-shell">
        ${TopBar(user, s)}
        <main class="page-content">
          <div class="page-head">
            <div>
              <div class="eyebrow">${isManager ? 'Manager app · stock' : 'User app · stock'}</div>
              <h1>Inventory</h1>
              <p class="muted">
                ${isManager
                  ? 'All records across all users.'
                  : 'Every quality record you own, with numbered pages.'}
              </p>
            </div>
            <button class="btn ${s.ui.selectMode ? 'primary' : ''}" data-action="select-mode">
              ${s.ui.selectMode ? 'Done' : 'Select'}
            </button>
          </div>

          <div class="overview-grid">
            ${StatBox.overview({ label: 'Total items', value: o.totalItems, icon: '▦', key: 'all' })}
            ${StatBox.overview({ label: 'Total value', value: Utils.money(o.totalValue), icon: '₹', key: 'all' })}
            ${StatBox.overview({
              label: 'Incomplete', value: o.incomplete, icon: '◷',
              key: 'incomplete', selected: !!s.ui.filters.incomplete,
            })}
            ${StatBox.overview({
              label: 'Aging stock', value: o.aging, icon: '⌛',
              key: 'aging', selected: !!s.ui.filters.aging,
            })}
            ${StatBox.overview({
              label: 'Pending amount', value: Utils.money(o.pending), icon: '₹',
              key: 'pending', selected: !!s.ui.filters.pending,
            })}
            ${StatBox.overview({
              label: `Added this ${o.periodDays === 31 ? 'month' : 'week'}`,
              value: o.added, icon: '＋',
              key: 'added', selected: !!s.ui.filters.added,
            })}
          </div>

          ${filterBar(s)}

          <div class="filter-row" style="margin-top:4px;">
            <span class="muted" style="font-size:.78rem;font-weight:700;align-self:center;">
              Group by:
            </span>
            <button class="chip ${grouped ? 'active' : ''}" data-action="group-type">Quality Type</button>
            <button class="chip ${!grouped ? 'active' : ''}" data-action="group-none">None</button>
          </div>

          ${grouped ? renderGrouped(filtered, s, isManager) : renderFlat(filtered, s, isManager)}

          ${s.ui.selectMode && (s.ui.selectedIds || []).length ? `
            <div class="select-bar">
              <strong>${s.ui.selectedIds.length} selected</strong>
              <div class="row">
                <button class="btn small" data-action="export-selected">Export</button>
                <button class="btn small danger" data-action="archive-selected">Delete → Archive</button>
              </div>
            </div>
          ` : ''}
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
          <input id="inv-search" value="${Utils.esc(s.ui.search)}"
                 placeholder="Search quality, lot, colour, ID, notes…" />
        </div>
        <button class="btn" data-action="open-filter">⚙ Filter</button>
        <select class="btn" id="inv-sort">
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

  function renderFlat(records, s, isManager) {
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

    const cards = slice.map(r => renderCardWithExpand(r, s, isManager)).join('');

    return `
      <div class="record-list">${cards}</div>
      ${renderPagination(page, total)}
    `;
  }

  function renderGrouped(records, s, isManager) {
    const groups = {};
    for (const r of records) {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    }
    const order = ['Bra', 'Panty', 'Set', 'Blouse'];
    const sections = order.filter(t => groups[t]?.length).map(type => {
      const list = groups[type];
      return `
        <h3 class="group-header">${type.toUpperCase()} <span class="muted">(${list.length})</span></h3>
        ${renderGroupList(list, s, isManager)}
      `;
    }).join('');
    return sections || `<div class="card empty">No records.</div>`;
  }

  function renderGroupList(records, s, isManager) {
    const PER = 5;
    const total = Math.max(1, Math.ceil(records.length / PER));
    const page = Math.min(s.ui.page, total);
    const slice = records.slice((page - 1) * PER, page * PER);
    return `
      <div class="record-list">
        ${slice.map(r => renderCardWithExpand(r, s, isManager)).join('')}
      </div>
      ${total > 1 ? renderPagination(page, total) : ''}
    `;
  }

  function renderCardWithExpand(r, s, isManager) {
    const expanded = s.ui.expandedId === r.id;
    const editing = s.ui.editingId === r.id;

    const collapsed = RecordCard.renderCollapsed(r, {
      selectable: s.ui.selectMode,
      selected: (s.ui.selectedIds || []).includes(r.id),
      showOwner: isManager,
    });

    if (!expanded) return collapsed;

    const inner = editing && s.ui.editDraft
      ? RecordCard.renderEdit(r, s.ui.editDraft)
      : RecordCard.renderDetail(r, s._payments || [], { isManagerView: isManager });

    return collapsed.replace('</article>', inner + '</article>');
  }

  function renderPagination(current, total) {
    if (total <= 1) return '';
    const pages = [];
    const win = 2;
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || Math.abs(i - current) <= win) {
        pages.push({ n: i, active: i === current });
      } else if (pages[pages.length - 1]?.n !== '…') {
        pages.push({ n: '…', active: false });
      }
    }
    return `
      <div class="pagination">
        <button ${current === 1 ? 'disabled' : ''} data-page="${current - 1}">‹</button>
        ${pages.map(p => p.n === '…'
          ? `<span style="padding:0 6px;color:var(--text-muted);">…</span>`
          : `<button class="${p.active ? 'active' : ''}" data-page="${p.n}">${p.n}</button>`
        ).join('')}
        <button ${current === total ? 'disabled' : ''} data-page="${current + 1}">›</button>
      </div>
    `;
  }

  function mount(root) {
    Utils.$$('[data-nav]', root).forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.nav;
      if (p === 'inventory') return;
      Router.go(p);
    }));

    Utils.$$('[data-action="sync"]', root).forEach(b => b.addEventListener('click', () => {
      Sync.triggerSync();
    }));

    Utils.$$('[data-action="select-mode"]', root).forEach(b =>
      b.addEventListener('click', () => {
        const s = Store.get();
        Store.set({ ui: { selectMode: !s.ui.selectMode, selectedIds: [] }});
      }));

    Utils.$$('[data-card]', root).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.card;
      const s = Store.get();
      const next = { ...s.ui.filters };
      if (k === 'incomplete') next.incomplete = !next.incomplete;
      else if (k === 'aging') next.aging = !next.aging;
      else if (k === 'pending') next.pending = !next.pending;
      else if (k === 'added') next.added = !next.added;
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

    Utils.$$('[data-action="apply-filter"]', root).forEach(b => b.addEventListener('click', () => {
      const f = {};
      const status = Utils.$('#filter-status', root)?.value;
      const type = Utils.$('#filter-type', root)?.value;
      const color = Utils.$('#filter-color', root)?.value;
      const payment = Utils.$('#filter-payment', root)?.value;
      const dateFrom = Utils.$('#filter-date-from', root)?.value;
      const dateTo = Utils.$('#filter-date-to', root)?.value;
      if (status) f.status = status;
      if (type) f.type = type;
      if (color) f.color = color;
      if (payment) f.payment = payment;
      if (dateFrom) f.dateFrom = dateFrom;
      if (dateTo) f.dateTo = dateTo;
      Store.set({ ui: { filters: f, page: 1, showFilterPanel: false }});
    }));

    Utils.$$('[data-action="reset-filters"]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: {
        filters: {}, search: '', sort: 'newest', page: 1, showFilterPanel: false,
      }})));

    const search = Utils.$('#inv-search', root);
    if (search) search.addEventListener('input', Utils.debounce(e => {
      Store.set({ ui: { search: e.target.value, page: 1 }});
      const el = Utils.$('#inv-search');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 180));

    const sortSel = Utils.$('#inv-sort', root);
    if (sortSel) sortSel.addEventListener('change', e =>
      Store.set({ ui: { sort: e.target.value, page: 1 }}));

    Utils.$$('[data-page]', root).forEach(b => {
      if (b.disabled) return;
      b.addEventListener('click', () => {
        const n = Number(b.dataset.page);
        if (!isNaN(n) && n > 0) Store.set({ ui: { page: n }});
      });
    });

    Utils.$$('[data-action="group-type"]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: { groupBy: true, page: 1 }})));
    Utils.$$('[data-action="group-none"]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: { groupBy: false, page: 1 }})));

    Utils.$$('[data-expand]', root).forEach(h => h.addEventListener('click', e => {
      if (e.target.closest('input,button,select')) return;
      const id = h.dataset.expand;
      const s = Store.get();
      const same = s.ui.expandedId === id;
      Store.set({ ui: { expandedId: same ? null : id, editingId: null, editDraft: null }});
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

    Utils.$$('[data-action="export-selected"]', root).forEach(b =>
      b.addEventListener('click', () => {
        const s = Store.get();
        const rows = (s._records || []).filter(r => s.ui.selectedIds.includes(r.id));
        if (!rows.length) return Toast.warning('Nothing selected.');
        exportCSV(rows);
      }));

    Utils.$$('[data-action="archive-selected"]', root).forEach(b =>
      b.addEventListener('click', async () => {
        const s = Store.get();
        if (!s.ui.selectedIds.length) return;
        const ok = await Modal.confirm({
          title: `Move ${s.ui.selectedIds.length} record(s) to Archive?`,
          text: 'They can be restored later from the Archive.',
          confirmLabel: 'Move to Archive',
          danger: true,
        });
        if (!ok) return;
        for (const id of s.ui.selectedIds) {
          const rec = (s._records || []).find(r => r.id === id);
          if (rec) {
            rec.archived = true;
            rec.archivedAt = Utils.nowISO();
            await DB.put('records', rec);
          }
        }
        await DashboardPage.refreshData();
        Store.set({ ui: { selectedIds: [], selectMode: false }});
        Toast.success('Moved to Archive.');
      }));

    /* Reuse dashboard handlers via delegation (edit, complete, archive, payment) */
    Utils.$$('[data-action="edit"]', root).forEach(b =>
      b.addEventListener('click', () => openEdit(b.dataset.id)));
    Utils.$$('[data-action="cancel-edit"]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: { editingId: null, editDraft: null }})));
    Utils.$$('[data-action="save-edit"]', root).forEach(b =>
      b.addEventListener('click', () => saveEdit(root, b.dataset.id)));
    Utils.$$('[data-action="complete"]', root).forEach(b =>
      b.addEventListener('click', () => completeRecord(b.dataset.id)));
    Utils.$$('[data-action="archive"]', root).forEach(b =>
      b.addEventListener('click', () => archiveRecord(b.dataset.id)));
    Utils.$$('[data-action="add-payment"]', root).forEach(b =>
      b.addEventListener('click', () => openPaymentModal(b.dataset.id)));

    Utils.$$('[data-edit-cup]', root).forEach(b =>
      b.addEventListener('click', () => {
        const s = Store.get();
        Store.set({ ui: { editDraft: { ...s.ui.editDraft, cup: b.dataset.editCup }}});
      }));

    Utils.$$('[data-edit-status]', root).forEach(b =>
      b.addEventListener('click', () => {
        const s = Store.get();
        Store.set({ ui: { editDraft: { ...s.ui.editDraft, status: b.dataset.editStatus }}});
      }));

    Utils.$$('[data-edit-mode]', root).forEach(b =>
      b.addEventListener('click', () => switchEditMode(b.dataset.editMode)));

    Utils.$$('[data-edit-color]', root).forEach(b =>
      b.addEventListener('click', () => toggleEditColor(b.dataset.editColor)));
  }

  function openEdit(id) {
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
    Store.set({ ui: { editingId: id, editDraft: draft, expandedId: id }});
  }

  function switchEditMode(mode) {
    const s = Store.get();
    const draft = s.ui.editDraft;
    if (!draft || mode === draft.mode) return;

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
  }

  function toggleEditColor(name) {
    const s = Store.get();
    const draft = s.ui.editDraft;
    const colors = draft.colors.includes(name)
      ? draft.colors.filter(x => x !== name)
      : [...draft.colors, name];
    const byColor = { ...(draft.quantitiesByColor || {}) };
    if (!byColor[name]) byColor[name] = Calc.emptyQuantities();
    Store.set({ ui: { editDraft: { ...draft, colors, quantitiesByColor: byColor }}});
  }

  async function saveEdit(root, id) {
    /* Delegate to Dashboard's saveEdit for consistency */
    return DashboardPage.mount; // placeholder
  }

  async function completeRecord(id) {
    const s = Store.get();
    const rec = (s._records || []).find(r => r.id === id);
    if (!rec) return;
    const ok = await Modal.confirm({
      title: 'Mark as Completed?',
      text: 'Payment does not need to be full — status is a manual choice.',
      confirmLabel: 'Mark as Completed',
    });
    if (!ok) return;
    rec.status = 'COMPLETED';
    rec.lastModified = Utils.nowISO();
    await DB.put('records', rec);
    await Auth.logAudit(s.session.userId, s.session.name, 'RECORD_COMPLETED', rec.id);
    await DashboardPage.refreshData();
    Toast.success('Marked as completed.');
  }

  async function archiveRecord(id) {
    const s = Store.get();
    const rec = (s._records || []).find(r => r.id === id);
    if (!rec) return;
    const ok = await Modal.confirm({
      title: 'Move to Archive?',
      text: 'Restorable later from My Archive. Never permanently deleted here.',
      confirmLabel: 'Move to Archive',
      danger: true,
    });
    if (!ok) return;
    rec.archived = true;
    rec.archivedAt = Utils.nowISO();
    await DB.put('records', rec);
    await Auth.logAudit(s.session.userId, s.session.name, 'RECORD_ARCHIVED', rec.id);
    await DashboardPage.refreshData();
    Store.set({ ui: { expandedId: null }});
    Toast.success('Record moved to Archive.');
  }

  function openPaymentModal(recordId) {
    const s = Store.get();
    const rec = (s._records || []).find(r => r.id === recordId);
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
        await DashboardPage.refreshData();
        Toast.success('Payment added.');
        return true;
      },
    });
  }

  function exportCSV(rows) {
    const head = ['Quality ID','Quality','Type','Cup','Colours','Mode','Dozen','Price/dozen',
                  'Amount','Received','Pending','Payment Status','Status','Lot','Entry date','Notes'];
    const lines = [head, ...rows.map(r => {
      const c = Calc.compute(r);
      const p = Calc.totalReceived(r, Store.get()._payments || []);
      return [
        r.id, r.quality, r.type, r.cup, r.colors.join(', '), r.mode,
        c.totalDozen.toFixed(2), r.priceSnapshot, c.amount, p,
        Math.max(0, c.amount - p), Calc.paymentStatus(r, Store.get()._payments || []),
        r.status, r.lot || '', r.entryDate, r.notes || '',
      ];
    })].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([lines], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alishan-inventory.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Toast.success('CSV export downloaded.');
  }

  return { render, mount };
})();

window.InventoryPage = InventoryPage;