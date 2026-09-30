/* ============================================================
   ALISHAN · BACKUP & RESTORE PAGE
   Scope: role-aware (User = own data, Manager = all users).
   Snapshots persist across reload (P0-08 fix).
   Restore validates scope + ID collisions (P0-03, P0-04 fix).
   ============================================================ */

const BackupPage = (() => {

  const _state = {
    calendarMonth: new Date(),
    backups: [],
    loaded: false,
  };

  function isManager() {
    return Store.get().session?.role === 'Manager';
  }

  function currentScope() {
    return isManager() ? 'manager-all-users' : 'user';
  }

  async function loadBackups() {
    try {
      const s = Store.get();
      const mgr = isManager();
      const uid = s.session?.userId;

      const metadata = await DB.getAll('backups');
      const filtered = metadata
        .filter(b => mgr
          ? b.scope === 'manager-all-users'
          : (b.scope === 'user' && b.ownerId === uid))
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

      const withSnapshots = await Promise.all(
        filtered.map(async b => {
          try {
            const snap = await DB.get('backupSnapshots', b.id);
            return { ...b, snapshot: snap?.value || null };
          } catch (_) {
            return { ...b, snapshot: null };
          }
        })
      );

      _state.backups = withSnapshots;
      _state.loaded = true;
    } catch (e) {
      console.warn('[backup] load failed', e);
    }
  }

  async function downloadBackup(type = 'Manual') {
    const s = Store.get();
    const uid = s.session.userId;
    const mgr = isManager();
    const scope = currentScope();

    const records = mgr
      ? (s._records || [])
      : (s._records || []).filter(r => r.ownerId === uid);

    const payments = mgr
      ? (s._payments || [])
      : (s._payments || []).filter(p => (s._records || [])
          .some(r => r.id === p.recordId && r.ownerId === uid));

    const snapshot = {
      version: 1,
      exportedAt: Utils.nowISO(),
      exportedBy: { id: uid, name: s.session.name },
      scope,
      data: {
        records,
        payments,
        prefs: s.prefs,
        notifications: s.notifications,
        ...(mgr ? {
          users: s._users || [],
          masters: {
            qualities: MasterData.getAllQualities(),
            colors: MasterData.getAllColors(),
          },
        } : {}),
      },
    };

    const backupId = Utils.uid('B');
    const meta = {
      id: backupId,
      type,
      timestamp: snapshot.exportedAt,
      size: JSON.stringify(snapshot).length,
      scope,
      ownerId: uid,
      recordCount: records.length,
      paymentCount: payments.length,
    };
    await DB.put('backups', meta);
    await DB.put('backupSnapshots', { id: backupId, value: snapshot });

    _state.backups.unshift({ ...meta, snapshot });
    _state.backups = _state.backups.slice(0, 50);

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alishan-${mgr ? 'manager' : 'user'}-backup-${Utils.todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    await Auth.logAudit(uid, s.session.name, 'BACKUP_CREATED',
      `${scope} · ${records.length} records, ${payments.length} payments`);

    Toast.success('Backup downloaded.');
    Router.render();
  }

  function validateBackupShape(parsed) {
    if (!parsed?.data?.records || !Array.isArray(parsed.data.records)) {
      return { ok: false, error: 'Backup is missing records array.' };
    }
    if (!parsed.data.payments || !Array.isArray(parsed.data.payments)) {
      return { ok: false, error: 'Backup is missing payments array.' };
    }
    return { ok: true };
  }

  async function detectIdCollisions(records, scope, currentUserId) {
    const existing = await DB.getAll('records');
    const existingIds = new Set(existing.map(r => r.id));

    const collisions = [];
    for (const r of records) {
      if (existingIds.has(r.id)) {
        if (scope === 'user') {
          const existingRec = existing.find(x => x.id === r.id);
          if (existingRec.ownerId !== currentUserId) {
            collisions.push({ id: r.id, reason: 'Belongs to another user' });
          }
        } else {
          collisions.push({ id: r.id, reason: 'Already exists' });
        }
      }
    }
    return collisions;
  }

  async function restoreFromFile(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const shapeOk = validateBackupShape(parsed);
      if (!shapeOk.ok) { Toast.error(shapeOk.error); return; }

      const s = Store.get();
      const uid = s.session.userId;
      const mgr = isManager();
      const backupScope = parsed.scope || 'user';

      if (backupScope === 'manager-all-users' && !mgr) {
        Toast.error('Only a Manager can restore a manager backup.');
        return;
      }

      const scopeText = backupScope === 'manager-all-users'
        ? 'This will overwrite ALL USERS\' records with the backup.'
        : 'This will OVERWRITE your current records with the backup.';
      const ok = await Modal.confirm({
        title: 'Restore this backup?',
        text: `${scopeText} It does not merge. Continue?`,
        confirmLabel: 'Restore (overwrite)',
        danger: true,
      });
      if (!ok) return;

      const collisions = await detectIdCollisions(parsed.data.records, backupScope, uid);
      if (backupScope === 'user' && collisions.length > 0) {
        Toast.error(`${collisions.length} record ID(s) conflict with another user's data. Restore blocked.`);
        return;
      }

      const existingRecords = s._records || [];

      let toDeleteRecords;
      if (backupScope === 'manager-all-users') {
        toDeleteRecords = existingRecords;
      } else {
        toDeleteRecords = existingRecords.filter(r => r.ownerId === uid);
      }

      const toDeletePayments = (s._payments || []).filter(p =>
        toDeleteRecords.some(r => r.id === p.recordId));

      for (const r of toDeleteRecords) await DB.del('records', r.id);
      for (const p of toDeletePayments) await DB.del('payments', p.id);

      const collisionIds = new Set(collisions.map(c => c.id));
      let insertedRecords = 0;
      let insertedPayments = 0;

      for (const r of parsed.data.records) {
        if (backupScope === 'manager-all-users' && collisionIds.has(r.id)) {
          const existingRec = await DB.get('records', r.id);
          if (existingRec) continue;
        }
        if (backupScope === 'user') {
          r.ownerId = uid;
          r.ownerName = s.session.name;
        }
        await DB.put('records', r);
        insertedRecords++;
      }

      for (const p of (parsed.data.payments || [])) {
        if (backupScope === 'manager-all-users') {
          const rec = await DB.get('records', p.recordId);
          if (!rec) continue;
        }
        await DB.put('payments', p);
        insertedPayments++;
      }

      if (backupScope === 'manager-all-users') {
        if (Array.isArray(parsed.data.users)) {
          for (const u of parsed.data.users) {
            const existing = await DB.get('users', u.id);
            if (!existing) await DB.put('users', u);
          }
        }
        if (parsed.data.masters) {
          await MasterData.importFromBackup(parsed.data.masters);
        }
      }

      if (backupScope === 'user') {
        if (parsed.data.prefs) {
          const merged = { ...s.prefs, ...parsed.data.prefs };
          Store.set({ prefs: merged });
          await DB.setPrefs(uid, merged);
        }
        if (parsed.data.notifications) {
          const merged = { ...s.notifications, ...parsed.data.notifications };
          Store.set({ notifications: merged });
          await DB.setNotifications(uid, merged);
        }
      }

      await Auth.logAudit(uid, s.session.name, 'BACKUP_RESTORED',
        `${backupScope} · ${insertedRecords} records, ${insertedPayments} payments`);

      await DashboardPage.refreshData();
      await loadBackups();
      Toast.success(`Restore complete · ${insertedRecords} records, ${insertedPayments} payments.`);
      Router.render();
    } catch (e) {
      console.error(e);
      Toast.error('Backup file is not valid.');
    }
  }

  function renderCalendar() {
    const month = _state.calendarMonth;
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const last = new Date(year, m + 1, 0);
    const startDow = first.getDay();
    const daysInMonth = last.getDate();

    const backupDays = new Set();
    for (const b of _state.backups) {
      const d = new Date(b.timestamp);
      if (d.getFullYear() === year && d.getMonth() === m) {
        backupDays.add(d.getDate());
      }
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === m;

    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(`<div></div>`);
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = isCurrentMonth && today.getDate() === d;
      const has = backupDays.has(d);
      cells.push(`
        <div class="day ${isToday ? 'today' : ''} ${has ? 'has-backup' : ''}">${d}</div>
      `);
    }

    return `
      <div class="backup-calendar">
        <div class="backup-calendar-head">
          <button class="btn small" data-cal-prev>‹</button>
          <strong>${first.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</strong>
          <button class="btn small" data-cal-next>›</button>
        </div>
        <div class="backup-calendar-grid">
          ${['S','M','T','W','T','F','S'].map(d => `<div class="dow">${d}</div>`).join('')}
          ${cells.join('')}
        </div>
      </div>
    `;
  }

  function render() {
    const s = Store.get();
    const user = s.session || { name: 'User', role: 'User' };
    const uid = s.session?.userId;
    const mgr = user.role === 'Manager';

    const visibleRecords = mgr
      ? (s._records || [])
      : (s._records || []).filter(r => r.ownerId === uid);

    const visiblePayments = mgr
      ? (s._payments || [])
      : (s._payments || []).filter(p => (s._records || [])
          .some(r => r.id === p.recordId && r.ownerId === uid));

    const usedKB = Math.round(JSON.stringify({
      records: visibleRecords,
      payments: visiblePayments,
    }).length / 1024);

    const backups = _state.backups;

    return `
      <div class="app-shell">
        ${TopBar(user, s)}
        <main class="page-content">
          <div class="page-head">
            <div>
              <div class="eyebrow">Settings · ${mgr ? 'all data' : 'my data'}</div>
              <h1>Backup &amp; restore</h1>
              <p class="muted">${mgr
                ? 'All users combined. Restores overwrite, they never merge.'
                : 'Your own records only. Restores overwrite, they never merge.'}</p>
            </div>
            <button class="btn primary" data-action="backup-now">Backup now</button>
          </div>

          <div class="overview-grid">
            ${StatBox.overview({
              label: 'Active records',
              value: visibleRecords.filter(r => !r.archived).length,
              icon: '▦', key: 'a',
            })}
            ${StatBox.overview({
              label: 'Archived',
              value: visibleRecords.filter(r => r.archived).length,
              icon: '⌁', key: 'a',
            })}
            ${StatBox.overview({
              label: 'Payments',
              value: visiblePayments.length,
              icon: '₹', key: 'a',
            })}
            ${StatBox.overview({
              label: 'Local size',
              value: usedKB + ' KB',
              icon: '◫', key: 'a',
            })}
          </div>

          <section class="setting-section" style="margin-top:18px;">
            <div class="section-title"><h2>Backup schedule</h2></div>
            ${renderCalendar()}
          </section>

          <section class="setting-section">
            <div class="section-title"><h2>Manual operations</h2></div>

            <div class="setting-row">
              <div>
                <strong>Download backup</strong>
                <small>Includes records, payments, preferences and notifications${mgr ? ', users and masters' : ''}</small>
              </div>
              <button class="btn small" data-action="backup-now">Download</button>
            </div>

            <div class="setting-row">
              <div>
                <strong>Restore from file</strong>
                <small>Overwrites current records with the chosen backup — does NOT merge</small>
              </div>
              <label class="btn small" style="display:inline-block;">
                Choose file
                <input type="file" accept=".json" data-restore style="display:none" />
              </label>
            </div>

            <div class="setting-row">
              <div>
                <strong>Auto backup</strong>
                <small>Reminder only — downloads remain under your control</small>
              </div>
              <div class="row" style="gap:8px;">
                <select data-auto-backup-freq aria-label="Auto backup frequency"
                        style="padding:6px 10px;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font-size:.82rem;">
                  <option value="daily"   ${s.prefs.autoBackupFrequency === 'daily'   ? 'selected' : ''}>Daily</option>
                  <option value="weekly"  ${(s.prefs.autoBackupFrequency || 'weekly') === 'weekly'  ? 'selected' : ''}>Weekly</option>
                  <option value="monthly" ${s.prefs.autoBackupFrequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                </select>
                <button class="switch ${s.prefs.autoBackup ? 'on' : ''}" type="button"
                        aria-pressed="${!!s.prefs.autoBackup}"
                        aria-label="Auto backup"
                        data-toggle-auto-backup>
                  <span></span>
                </button>
              </div>
            </div>
          </section>

          <section class="setting-section">
            <div class="section-title">
              <h2>Recent backups</h2>
              <p class="muted">${backups.length} total · older entries persist in local storage</p>
            </div>

            ${backups.length ? `
              <div class="report-list">
                ${backups.slice(0, 10).map(b => `
                  <div class="report-row">
                    <div>
                      <strong>${Utils.esc(b.type)} backup</strong>
                      <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">
                        ${Utils.fmtDateTime(b.timestamp)} · ${Math.round(b.size / 1024)} KB
                        ${b.recordCount != null ? ` · ${b.recordCount} records` : ''}
                      </div>
                    </div>
                    <div class="row" style="gap:6px;">
                      <span class="badge completed">completed</span>
                      <button class="btn small" data-download-entry="${Utils.esc(b.id)}">Download</button>
                      ${b.snapshot
                        ? `<button class="btn small primary" data-restore-entry="${Utils.esc(b.id)}">Restore</button>`
                        : `<button class="btn small" disabled title="Snapshot missing">Restore</button>`}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `<div class="empty">No backup generated yet.</div>`}
          </section>
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

  async function mount(root) {
    await loadBackups();

    Utils.$$('[data-nav]', root).forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.nav;
      if (p === 'settings') { Router.go('settings'); return; }
      Router.go(p);
    }));

    Utils.$$('[data-action="sync"]', root).forEach(b =>
      b.addEventListener('click', () => Sync.triggerSync()));

    Utils.$$('[data-action="backup-now"]', root).forEach(b =>
      b.addEventListener('click', () => downloadBackup('Manual')));

    Utils.$$('[data-restore]', root).forEach(input =>
      input.addEventListener('change', e => {
        const f = e.target.files?.[0];
        if (f) restoreFromFile(f);
        e.target.value = '';
      }));

    Utils.$$('[data-auto-backup-freq]', root).forEach(sel =>
      sel.addEventListener('change', async () => {
        const s = Store.get();
        const next = { ...s.prefs, autoBackupFrequency: sel.value };
        Store.set({ prefs: next });
        await DB.setPrefs(s.session.userId, next);
        Toast.success('Frequency saved.');
      }));

    Utils.$$('[data-toggle-auto-backup]', root).forEach(b =>
      b.addEventListener('click', async () => {
        const s = Store.get();
        const next = { ...s.prefs, autoBackup: !s.prefs.autoBackup };
        Store.set({ prefs: next });
        await DB.setPrefs(s.session.userId, next);
        Router.render();
      }));

    Utils.$$('[data-download-entry]', root).forEach(b =>
      b.addEventListener('click', () => {
        const backup = _state.backups.find(x => x.id === b.dataset.downloadEntry);
        if (!backup?.snapshot) return Toast.error('Snapshot not available.');
        const blob = new Blob([JSON.stringify(backup.snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alishan-backup-${backup.id}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        Toast.success('Downloaded.');
      }));

    Utils.$$('[data-restore-entry]', root).forEach(b =>
      b.addEventListener('click', async () => {
        const backup = _state.backups.find(x => x.id === b.dataset.restoreEntry);
        if (!backup?.snapshot) return Toast.error('Snapshot not available.');
        const blob = new Blob([JSON.stringify(backup.snapshot)], { type: 'application/json' });
        const file = new File([blob], 'restore.json', { type: 'application/json' });
        await restoreFromFile(file);
      }));

    Utils.$$('[data-cal-prev]', root).forEach(b =>
      b.addEventListener('click', () => {
        _state.calendarMonth = new Date(_state.calendarMonth.getFullYear(), _state.calendarMonth.getMonth() - 1, 1);
        Router.render();
      }));
    Utils.$$('[data-cal-next]', root).forEach(b =>
      b.addEventListener('click', () => {
        _state.calendarMonth = new Date(_state.calendarMonth.getFullYear(), _state.calendarMonth.getMonth() + 1, 1);
        Router.render();
      }));
  }

  return { render, mount };
})();

window.BackupPage = BackupPage;