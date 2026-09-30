/* ============================================================
   ALISHAN · MANAGER DASHBOARD
   Combined view across all users. View-only on record content.
   Full filter panel: User, Quality, Type, Colour, Cup, Lot,
   Payment, Date range, Status.

   PHASE 1 FIX (P0-05):
   - Removed data-page collision between navigation and pagination.
   - Nav uses data-nav; pagination uses data-page; row-level uses data-route.
   - Pagination no longer triggers Router.go('1') accidentally.
   ============================================================ */

const ManagerDashboardPage = (() => {

  function allRecords() {
    const s = Store.get();
    return (s._records || []).filter(r => !r.archived);
  }

  function filteredRecords() {
    const s = Store.get();
    let rs = allRecords();

    const q = Utils.normalize(s.ui.search);
    if (q) {
      rs = rs.filter(r => {
        const hay = [
          r.id, r.quality, r.type, r.cup, r.lot, r.notes, r.maalGaya,
          r.weight, r.meter, r.ownerName, ...(r.colors || []),
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
    if (Array.isArray(f.users) && f.users.length) {
      rs = rs.filter(r => f.users.includes(r.ownerId));
    }
    if (f.quality) {
      const fq = Utils.normalize(f.quality);
      rs = rs.filter(r => Utils.normalize(r.quality).includes(fq));
    }
    if (f.lot) {
      const fl = Utils.normalize(f.lot);
      rs = rs.filter(r => Utils.normalize(r.lot || '').includes(fl));
    }
    if (f.cup) rs = rs.filter(r => r.cup === f.cup);
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
    const s = Store.get();
    const f = s.ui.filters || {};
    let base = allRecords();

    if (Array.isArray(f.users) && f.users.length) {
      base = base.filter(r => f.users.includes(r.ownerId));
    }

    const payments = s._payments || [];
    const incomplete = base.filter(r => r.status === 'INCOMPLETE').length;
    const pending = base.reduce((a, r) => a + Calc.pendingAmount(r, payments), 0);
    const aging = base.filter(r => Calc.isAging(r)).length;
    const periodDays = s.prefs.period === 'monthly' ? 31 : 7;
    const added = base.filter(r => Utils.daysBetween(r.createdAt) < periodDays).length;
    return { incomplete, pending, aging, added, periodDays };
  }

  function render() {
    const s = Store.get();
    const user = s.session || { name: 'Manager', role: 'Manager' };
    const records = filteredRecords();
    const o = overviewNumbers();
    const pendingApprovals = MasterData.pendingCount();
    const users = s._users || [];

    return `
      <div class="app-shell">
        ${TopBar(user, s)}
        <main class="page-content">
          <div class="page-head">
            <div>
              <div class="eyebrow">Manager app · home</div>
              <h1>${Utils.esc(Utils.getGreeting())}, ${Utils.esc(user.name.split(' ')[0])}</h1>
              <p class="muted">Overview across every user · view-only on records.</p>
            </div>
            <button class="btn" data-action="sync">↻ Sync now</button>
          </div>

          ${pendingApprovals > 0 ? `
            <div class="notice" style="margin-bottom:14px;border-color:var(--warning);background:var(--warning-soft);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div>
                <strong>⚠ ${pendingApprovals} master data ${pendingApprovals === 1 ? 'entry' : 'entries'} pending approval</strong>
              </div>
              <button class="btn small primary" data-route="approvals">Review →</button>
            </div>
          ` : ''}

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

          ${filterBar(s, users)}
          ${userChips(s, users)}

          <div class="section-title" style="margin-top:26px;">
            <div>
              <h2>All records</h2>
              <p class="muted">${records.length} record${records.length === 1 ? '' : 's'} · view-only · tap to expand</p>
            </div>
          </div>

          ${renderList(records, s)}
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
            <span class="name">${Utils.esc(user.name)} <span class="badge accent" style="font-size:.6rem;margin-left:4px;">MGR</span></span>
          </div>
        </div>
      </header>
    `;
  }

  function filterBar(s, users) {
    const chips = renderChips(s, users);

    return `
      <div class="toolbar">
        <div class="search">
          <span class="icon">⌕</span>
          <input id="mgr-search" value="${Utils.esc(s.ui.search)}"
                 placeholder="Search quality, user, lot, colour, ID…" />
        </div>
        <button class="btn" data-action="open-filter">⚙ Filter</button>
        <select class="btn" id="mgr-sort">
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

  function renderChips(s, users) {
    const f = s.ui.filters || {};
    const out = [];

    const humanize = (k, v) => {
      if (k === 'incomplete') return 'Incomplete';
      if (k === 'aging') return 'Aging 10d+';
      if (k === 'pending') return 'Has pending';
      if (k === 'added') return 'Added recently';
      if (k === 'quality') return `Quality: ${v}`;
      if (k === 'lot') return `Lot: ${v}`;
      if (k === 'cup') return `Cup ${v}`;
      if (k === 'dateFrom') return `From ${v}`;
      if (k === 'dateTo') return `To ${v}`;
      return String(v);
    };

    for (const [k, v] of Object.entries(f)) {
      if (k === 'users') {
        if (!Array.isArray(v) || !v.length) continue;
        const names = v.map(id => {
          const u = users.find(x => x.id === id);
          return u ? u.name.split(' ')[0] : id;
        }).join(', ');
        out.push(`<button class="chip active" data-remove-filter="${k}">
          👤 ${Utils.esc(names)} <span class="x">×</span>
        </button>`);
        continue;
      }
      if (v === '' || v === false || v == null) continue;
      out.push(`<button class="chip active" data-remove-filter="${Utils.esc(k)}">
        ${Utils.esc(humanize(k, v))} <span class="x">×</span>
      </button>`);
    }
    return out.join('');
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
            <label for="filter-quality">Quality name</label>
            <input id="filter-quality" value="${Utils.esc(f.quality || '')}" placeholder="e.g. BEAUTYBOX" />
          </div>
          <div class="field">
            <label for="filter-color">Colour</label>
            <select id="filter-color">
              <option value="">All</option>
              ${colors.map(c => `<option value="${Utils.esc(c.name)}" ${f.color === c.name ? 'selected' : ''}>${Utils.esc(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="filter-cup">Cup</label>
            <select id="filter-cup">
              <option value="">All</option>
              ${['A','B','C','D','E','F'].map(x => `<option ${f.cup === x ? 'selected' : ''}>${x}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="filter-lot">Lot number</label>
            <input id="filter-lot" value="${Utils.esc(f.lot || '')}" placeholder="Search lot" />
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

  function userChips(s, users) {
    if (!users.length) return '';
    const active = s.ui.filters?.users || [];
    return `
      <div class="filter-row" style="margin-top:6px;">
        <span class="muted" style="font-size:.72rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;align-self:center;">
          Users:
        </span>
        ${users.map(u => {
          const on = active.includes(u.id);
          return `<button class="chip ${on ? 'active' : ''}" data-user-chip="${Utils.esc(u.id)}">
            👤 ${Utils.esc(u.name.split(' ')[0])}${on ? ' <span class="x">×</span>' : ''}
          </button>`;
        }).join('')}
        ${active.length ? `<button class="chip" data-user-clear style="color:var(--danger);border-color:var(--danger);">Clear users</button>` : ''}
      </div>
    `;
  }

  function renderList(records, s) {
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
      const collapsed = RecordCard.renderCollapsed(r, { showOwner: true });
      if (!expanded) return collapsed;
      const inner = RecordCard.renderDetail(r, s._payments || [], { isManagerView: true });
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

  function mount(root) {
    /* ---------- Nav: data-nav ---------- */
    Utils.$$('[data-nav]', root).forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.nav;
      if (p === 'dashboard') return;
      Router.go(p);
    }));

    /* ---------- Row-level navigation: data-route (PHASE 1 FIX) ---------- */
    Utils.$$('[data-route]', root).forEach(b => b.addEventListener('click', () => {
      const r = b.dataset.route;
      if (r) Router.go(r);
    }));

    /* ---------- Sync ---------- */
    Utils.$$('[data-action="sync"]', root).forEach(b =>
      b.addEventListener('click', () => Sync.triggerSync()));

    /* ---------- Expand ---------- */
    Utils.$$('[data-expand]', root).forEach(h => h.addEventListener('click', e => {
      if (e.target.closest('input,button,select')) return;
      const id = h.dataset.expand;
      const s = Store.get();
      const same = s.ui.expandedId === id;
      Store.set({ ui: { expandedId: same ? null : id }});
    }));

    /* ---------- Overview card filters ---------- */
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

    /* ---------- Remove filter chip ---------- */
    Utils.$$('[data-remove-filter]', root).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.removeFilter;
      const s = Store.get();
      const next = { ...s.ui.filters };
      delete next[k];
      Store.set({ ui: { filters: next, page: 1 }});
    }));

    /* ---------- User chips ---------- */
    Utils.$$('[data-user-chip]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      const id = b.dataset.userChip;
      const list = s.ui.filters?.users || [];
      const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
      Store.set({ ui: { filters: { ...s.ui.filters, users: next }, page: 1 }});
    }));

    Utils.$$('[data-user-clear]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      const f = { ...s.ui.filters };
      delete f.users;
      Store.set({ ui: { filters: f, page: 1 }});
    }));

    /* ---------- Filter panel ---------- */
    Utils.$$('[data-action="open-filter"]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: { showFilterPanel: true }})));
    Utils.$$('[data-action="close-filter"]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: { showFilterPanel: false }})));

    Utils.$$('[data-action="apply-filter"]', root).forEach(b => b.addEventListener('click', () => {
      const s = Store.get();
      const prevUsers = s.ui.filters?.users || [];
      const f = {};
      if (prevUsers.length) f.users = prevUsers;

      const status   = Utils.$('#filter-status', root)?.value;
      const type     = Utils.$('#filter-type', root)?.value;
      const quality  = Utils.$('#filter-quality', root)?.value;
      const color    = Utils.$('#filter-color', root)?.value;
      const cup      = Utils.$('#filter-cup', root)?.value;
      const lot      = Utils.$('#filter-lot', root)?.value;
      const payment  = Utils.$('#filter-payment', root)?.value;
      const dateFrom = Utils.$('#filter-date-from', root)?.value;
      const dateTo   = Utils.$('#filter-date-to', root)?.value;

      if (status)   f.status = status;
      if (type)     f.type = type;
      if (quality)  f.quality = quality;
      if (color)    f.color = color;
      if (cup)      f.cup = cup;
      if (lot)      f.lot = lot;
      if (payment)  f.payment = payment;
      if (dateFrom) f.dateFrom = dateFrom;
      if (dateTo)   f.dateTo = dateTo;

      Store.set({ ui: { filters: f, page: 1, showFilterPanel: false }});
    }));

    Utils.$$('[data-action="reset-filters"]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: {
        filters: {}, search: '', sort: 'newest', page: 1, showFilterPanel: false,
      }})));

    /* ---------- Search ---------- */
    const search = Utils.$('#mgr-search', root);
    if (search) search.addEventListener('input', Utils.debounce(e => {
      Store.set({ ui: { search: e.target.value, page: 1 }});
    }, 180));

    /* ---------- Sort ---------- */
    const sortSel = Utils.$('#mgr-sort', root);
    if (sortSel) sortSel.addEventListener('change', e =>
      Store.set({ ui: { sort: e.target.value, page: 1 }}));

    /* ---------- Pagination (PHASE 1 FIX — pure Store.set, no Router.go) ---------- */
    Utils.$$('[data-page]', root).forEach(b => {
      if (b.disabled) return;
      b.addEventListener('click', () => {
        const n = Number(b.dataset.page);
        if (!isNaN(n) && n > 0) Store.set({ ui: { page: n }});
      });
    });

    /* ---------- Manager archive exception ---------- */
    Utils.$$('[data-action="archive"]', root).forEach(b => b.addEventListener('click', async () => {
      const ok = await Modal.confirm({
        title: 'Archive this entry?',
        text: 'Sent to Archive — never edited or permanently deleted. Reversible.',
        confirmLabel: 'Archive',
        danger: true,
      });
      if (!ok) return;
      const id = b.dataset.id;
      const rec = (Store.get()._records || []).find(r => r.id === id);
      if (!rec) return;
      rec.archived = true;
      rec.archivedAt = Utils.nowISO();
      rec.archivedBy = Store.get().session.name;
      await DB.put('records', rec);
      await Auth.logAudit(Store.get().session.userId, Store.get().session.name,
        'RECORD_ARCHIVED_BY_MANAGER', `${rec.id} (${rec.quality})`);
      await DashboardPage.refreshData();
      Store.set({ ui: { expandedId: null }});
      Toast.success('Record archived.');
    }));
  }

  return { render, mount };
})();

window.ManagerDashboardPage = ManagerDashboardPage;