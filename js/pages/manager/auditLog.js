/* ============================================================
   ALISHAN · AUDIT LOG (Manager App)
   System-wide activity log. Export only, no clear.
   ============================================================ */

const AuditLogPage = (() => {

  const _state = { range: 'all', user: 'all', action: 'all', page: 1 };

  const RANGE_OPTIONS = [
    ['all', 'All time'],
    ['today', 'Today'],
    ['7', 'Last 7 days'],
    ['30', 'Last 30 days'],
  ];

  const ACTION_OPTIONS = [
    ['all', 'All actions'],
    ['LOGIN', 'Login'],
    ['LOGOUT', 'Logout'],
    ['RECORD_CREATED', 'Record created'],
    ['RECORD_EDITED', 'Record edited'],
    ['RECORD_COMPLETED', 'Record completed'],
    ['RECORD_ARCHIVED', 'Record archived'],
    ['RECORD_ARCHIVED_BY_MANAGER', 'Record archived (Manager)'],
    ['RECORD_RESTORED', 'Record restored'],
    ['RECORD_DELETED_FOREVER', 'Record deleted forever'],
    ['PAYMENT_ADDED', 'Payment added'],
    ['PAYMENT_EDITED', 'Payment edited'],
    ['PAYMENT_ARCHIVED', 'Payment archived'],
    ['USER_CREATED', 'User created'],
    ['USER_ACTIVATED', 'User activated'],
    ['USER_DEACTIVATED', 'User deactivated'],
    ['PASSWORD_CHANGED', 'Password changed'],
    ['PASSWORD_RESET', 'Password reset'],
    ['MASTER_SUBMITTED', 'Master submitted'],
    ['MASTER_APPROVED', 'Master approved'],
    ['MASTER_REJECTED', 'Master rejected'],
    ['MASTER_DEACTIVATED', 'Master deactivated'],
    ['MASTER_REACTIVATED', 'Master reactivated'],
    ['MASTER_PRICE_UPDATED', 'Master price updated'],
    ['MASTER_IMPORTED', 'Master imported'],
    ['BACKUP_CREATED', 'Backup created'],
    ['BACKUP_RESTORED', 'Backup restored'],
    ['GLOBAL_SETTING_CHANGED', 'Global setting changed'],
    ['PROBLEM_REPORTED', 'Problem reported'],
  ];

  function filtered(logs) {
    let rs = logs.slice();

    if (_state.range !== 'all') {
      const now = Date.now();
      let cutoff;
      if (_state.range === 'today') {
        const d = new Date(); d.setHours(0,0,0,0);
        cutoff = d.getTime();
      } else {
        cutoff = now - Number(_state.range) * 86400000;
      }
      rs = rs.filter(l => new Date(l.at).getTime() >= cutoff);
    }

    if (_state.user !== 'all') rs = rs.filter(l => l.userId === _state.user);
    if (_state.action !== 'all') rs = rs.filter(l => l.action === _state.action);

    rs.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    return rs;
  }

  function render() {
    const s = Store.get();
    const user = s.session || { name: 'Manager', role: 'Manager' };
    const logs = s._auditLog || [];

    const rows = filtered(logs);
    const per = 20;
    const total = Math.max(1, Math.ceil(rows.length / per));
    const page = Math.min(_state.page, total);
    const slice = rows.slice((page - 1) * per, page * per);

    const uniqueUsers = [];
    const seen = new Set();
    for (const l of logs) {
      if (l.userId && !seen.has(l.userId)) {
        seen.add(l.userId);
        uniqueUsers.push({ id: l.userId, name: l.userName });
      }
    }

    return `
      <div class="app-shell">
        ${TopBar(user, s)}
        <main class="page-content" style="max-width:960px;">
          <div class="page-head">
            <div>
              <div class="eyebrow">Manager app · admin</div>
              <h1>Audit log</h1>
              <p class="muted">System-wide activity · export only · never clear.</p>
            </div>
            <div class="row" style="gap:6px;">
              <button class="btn" data-action="back-settings">← Settings</button>
              <button class="btn" data-action="export-audit">↧ Export</button>
            </div>
          </div>

          <div class="card panel" style="padding:14px;margin-top:0;">
            <div class="form-grid">
              <div class="field">
                <label for="al-range">Date range</label>
                <select id="al-range">
                  ${RANGE_OPTIONS.map(([v, l]) =>
                    `<option value="${v}" ${_state.range === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="al-user">User</label>
                <select id="al-user">
                  <option value="all">All users</option>
                  ${uniqueUsers.map(u =>
                    `<option value="${Utils.esc(u.id)}" ${_state.user === u.id ? 'selected' : ''}>${Utils.esc(u.name)}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="al-action">Action</label>
                <select id="al-action">
                  ${ACTION_OPTIONS.map(([v, l]) =>
                    `<option value="${v}" ${_state.action === v ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-actions">
              <button class="btn primary" data-action="apply-audit">Apply</button>
              <button class="btn" data-action="clear-audit">Clear filters</button>
            </div>
          </div>

          <section class="setting-section" style="margin-top:14px;">
            <div class="section-title">
              <div>
                <strong>${rows.length}</strong>
                <span class="muted" style="font-size:.82rem;">event${rows.length === 1 ? '' : 's'}</span>
              </div>
            </div>

            ${slice.length ? slice.map(l => renderRow(l)).join('') : `<div class="empty">No activity matches.</div>`}

            ${total > 1 ? `
              <div class="pagination">
                <button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">‹</button>
                ${Array.from({ length: total }, (_, i) => `
                  <button class="${page === i + 1 ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>
                `).join('')}
                <button ${page === total ? 'disabled' : ''} data-page="${page + 1}">›</button>
              </div>
            ` : ''}
          </section>
        </main>
      </div>
    `;
  }

  function renderRow(l) {
    return `
      <div class="archive-item">
        <div>
          <strong>${Utils.esc(actionLabel(l.action))}</strong>
          <span class="badge neutral" style="margin-left:6px;font-size:.6rem;">${Utils.esc(l.action)}</span>
          <div class="archived-meta">
            ${Utils.esc(l.userName || l.userId || '—')} · ${Utils.fmtDateTime(l.at)}
            ${l.detail ? ` · ${Utils.esc(l.detail)}` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function actionLabel(code) {
    const found = ACTION_OPTIONS.find(([c]) => c === code);
    return found ? found[1] : code;
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

  function exportAudit() {
    const s = Store.get();
    const rows = filtered(s._auditLog || []);
    const head = ['When', 'User', 'Action', 'Detail'];
    const lines = [head, ...rows.map(l =>
      [Utils.fmtDateTime(l.at), l.userName || l.userId || '', l.action, l.detail || '']
    )].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([lines], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alishan-audit-log-${Utils.todayISO()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Toast.success('Audit log exported.');
  }

  async function loadLogs() {
    const logs = await DB.getAll('auditLog');
    Store.set({ _auditLog: logs });
  }

  function wireEvents() {
    const root = document.getElementById('app-root');

    Utils.$$('[data-nav]', root).forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.nav;
      if (p === 'settings') { Router.go('settings'); return; }
      Router.go(p);
    }));

    Utils.$$('[data-action="sync"]', root).forEach(b =>
      b.addEventListener('click', () => Sync.triggerSync()));

    Utils.$$('[data-action="back-settings"]', root).forEach(b =>
      b.addEventListener('click', () => {
        Store.set({ ui: { settingsTab: 'admin' }});
        Router.go('settings');
      }));

    Utils.$$('[data-action="apply-audit"]', root).forEach(b => b.addEventListener('click', () => {
      _state.range = Utils.$('#al-range', root)?.value || 'all';
      _state.user = Utils.$('#al-user', root)?.value || 'all';
      _state.action = Utils.$('#al-action', root)?.value || 'all';
      _state.page = 1;
      refresh();
    }));

    Utils.$$('[data-action="clear-audit"]', root).forEach(b => b.addEventListener('click', () => {
      _state.range = 'all'; _state.user = 'all'; _state.action = 'all'; _state.page = 1;
      refresh();
    }));

    Utils.$$('[data-action="export-audit"]', root).forEach(b =>
      b.addEventListener('click', exportAudit));

    Utils.$$('[data-page]', root).forEach(b => {
      if (b.disabled) return;
      b.addEventListener('click', () => {
        const n = Number(b.dataset.page);
        if (!isNaN(n) && n > 0) { _state.page = n; refresh(); }
      });
    });
  }

  function refresh() {
    const root = document.getElementById('app-root');
    root.innerHTML = render();
    wireEvents();
  }

  return {
    render,
    mount: async function () {
      await loadLogs();
      refresh();
    },
  };
})();

window.AuditLogPage = AuditLogPage;