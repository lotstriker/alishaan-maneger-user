/* ============================================================
   ALISHAN · ARCHIVE PAGE
   Scope: role-aware (User = own archive, Manager = all users).
   Nothing auto-expires. Only "Delete Forever" is irreversible.
   ============================================================ */

const ArchivePage = (() => {

  const _state = { search: '', page: 1, perPage: 5 };

  function archivedForCurrentUser() {
    const s = Store.get();
    const uid = s.session?.userId;
    if (!uid) return [];
    const isManager = s.session?.role === 'Manager';
    return (s._records || [])
      .filter(r => r.archived && (isManager || r.ownerId === uid))
      .sort((a, b) => (b.archivedAt || '').localeCompare(a.archivedAt || ''));
  }

  function filtered(list) {
    const q = Utils.normalize(_state.search);
    if (!q) return list;
    return list.filter(r => {
      const hay = [r.id, r.quality, r.type, r.lot, r.notes, r.maalGaya, r.ownerName]
        .join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function render() {
    const s = Store.get();
    const user = s.session || { name: 'User', role: 'User' };
    const isManager = user.role === 'Manager';

    const all = archivedForCurrentUser();
    const list = filtered(all);

    const per = _state.perPage;
    const total = Math.max(1, Math.ceil(list.length / per));
    const page = Math.min(_state.page, total);
    const slice = list.slice((page - 1) * per, page * per);

    return `
      <div class="app-shell">
        ${TopBar(user, s)}
        <main class="page-content" style="max-width:860px;">
          <div class="page-head">
            <div>
              <div class="eyebrow">Settings · ${isManager ? 'all users' : 'my data'}</div>
              <h1>${isManager ? 'Archive · all users' : 'My archive'}</h1>
              <p class="muted">Deleted items stay here until you explicitly delete forever.</p>
            </div>
            <button class="btn" data-action="back-settings">← Settings</button>
          </div>

          <div class="notice">
            Nothing auto-expires. <strong>Restore</strong> brings a record back intact.
            <strong>Delete Forever</strong> is the only irreversible action in the app.
          </div>

          <div class="card panel" style="margin-top:14px;">
            <div class="search">
              <span class="icon">⌕</span>
              <label for="archive-search" class="sr-only">Search archived items</label>
              <input id="archive-search" value="${Utils.esc(_state.search)}"
                     placeholder="Search archived items…" />
            </div>

            <div class="section-title" style="margin-top:14px;">
              <div>
                <strong>${list.length}</strong>
                <span class="muted" style="font-size:.82rem;">item${list.length === 1 ? '' : 's'} archived</span>
              </div>
            </div>

            ${slice.length ? slice.map(r => `
              <div class="archive-item">
                <div>
                  <strong class="strike">${Utils.esc(r.quality)}</strong>
                  ${isManager && r.ownerName ? `<span class="badge neutral" style="margin-left:6px;font-size:.6rem;">${Utils.esc(r.ownerName)}</span>` : ''}
                  <div class="archived-meta">
                    ${Utils.esc(r.id)} · ${Utils.esc(r.type)} · Cup ${Utils.esc(r.cup)} · archived ${Utils.ago(r.archivedAt || r.lastModified)}
                  </div>
                </div>
                <div class="row-actions">
                  <button class="btn small" data-action="restore" data-id="${Utils.esc(r.id)}">Restore</button>
                  <button class="btn small danger" data-action="delete-forever" data-id="${Utils.esc(r.id)}">Delete forever</button>
                </div>
              </div>
            `).join('') : `<div class="empty">Archive is empty.</div>`}

            ${total > 1 ? `
              <div class="pagination">
                <button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">‹</button>
                ${Array.from({ length: total }, (_, i) => `
                  <button class="${page === i + 1 ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>
                `).join('')}
                <button ${page === total ? 'disabled' : ''} data-page="${page + 1}">›</button>
              </div>
            ` : ''}
          </div>
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

  function mount(root) {
    Utils.$$('[data-nav]', root).forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.nav;
      if (p === 'settings') { Router.go('settings'); return; }
      Router.go(p);
    }));

    Utils.$$('[data-action="sync"]', root).forEach(b =>
      b.addEventListener('click', () => Sync.triggerSync()));

    Utils.$$('[data-action="back-settings"]', root).forEach(b =>
      b.addEventListener('click', () => Router.go('settings')));

    const search = Utils.$('#archive-search', root);
    if (search) search.addEventListener('input', Utils.debounce(e => {
      _state.search = e.target.value;
      _state.page = 1;
      Router.render();
      const el = Utils.$('#archive-search');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 180));

    Utils.$$('[data-page]', root).forEach(b => {
      if (b.disabled) return;
      b.addEventListener('click', () => {
        const n = Number(b.dataset.page);
        if (!isNaN(n) && n > 0) {
          _state.page = n;
          Router.render();
        }
      });
    });

    Utils.$$('[data-action="restore"]', root).forEach(b =>
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const s = Store.get();
        const rec = (s._records || []).find(r => r.id === id);
        if (!rec) return;
        rec.archived = false;
        delete rec.archivedAt;
        rec.lastModified = Utils.nowISO();
        await DB.put('records', rec);
        await Auth.logAudit(s.session.userId, s.session.name, 'RECORD_RESTORED', rec.id);
        await DashboardPage.refreshData();
        Toast.success('Record restored.');
        Router.render();
      }));

    Utils.$$('[data-action="delete-forever"]', root).forEach(b =>
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const s = Store.get();
        const rec = (s._records || []).find(r => r.id === id);
        if (!rec) return;

        const ok = await Modal.confirm({
          title: 'Delete forever?',
          text: `This is irreversible. "${rec.quality}" (${rec.id}) and its payments will be permanently removed.`,
          confirmLabel: 'Delete forever',
          danger: true,
        });
        if (!ok) return;

        const payments = (s._payments || []).filter(p => p.recordId === id);
        for (const p of payments) await DB.del('payments', p.id);
        await DB.del('records', id);
        await Auth.logAudit(s.session.userId, s.session.name, 'RECORD_DELETED_FOREVER', id);

        await DashboardPage.refreshData();
        Toast.success('Permanently deleted.');
        Router.render();
      }));
  }

  return { render, mount };
})();

window.ArchivePage = ArchivePage;