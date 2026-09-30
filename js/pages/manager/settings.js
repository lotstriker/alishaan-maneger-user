/* ============================================================
   ALISHAN · MANAGER SETTINGS
   Personal prefs (per-user) + Admin sections + honest 2FA.
   ============================================================ */

const ManagerSettingsPage = (() => {

  const ACCENTS = {
    blue:   '#2f8fa6',
    green:  '#23835c',
    purple: '#805bb5',
    orange: '#d8812e',
    pink:   '#d46f9b',
    teal:   '#2f9e9a',
  };

  const SECTIONS = [
    ['appearance',    'Appearance'],
    ['behaviour',     'App behaviour'],
    ['notifications', 'Notifications'],
    ['admin',         '⭐ Admin'],
    ['data',          'My data'],
    ['account',       'Account'],
    ['about',         'About'],
    ['help',          'Help & support'],
  ];

  function render() {
    const s = Store.get();
    const user = s.session || { name: 'Manager', role: 'Manager' };
    const tab = s.ui.settingsTab || 'appearance';

    return `
      <div class="app-shell">
        ${TopBar(user, s)}
        <main class="page-content">
          <div class="page-head">
            <div>
              <div class="eyebrow">Manager app · preferences &amp; admin</div>
              <h1>Settings</h1>
              <p class="muted">Global settings affect every user. Handle with care.</p>
            </div>
            <button class="btn danger" data-action="logout">Log out</button>
          </div>

          <div class="card" style="padding:14px;margin-top:0;">
            <div class="setting-row" style="border:0;padding:0;">
              <div>
                <strong>Quick actions</strong>
                <small>Admin tools with elevated permissions.</small>
              </div>
              <div class="quick-actions">
                <button class="btn small primary" data-page="users">＋ Add user</button>
                <button class="btn small" data-action="backup-now">Backup now</button>
                <button class="btn small" data-page="approvals">Approvals</button>
                <button class="btn small" data-page="auditLog">Audit log</button>
              </div>
            </div>
          </div>

          <div class="settings-layout" style="margin-top:16px;">
            <nav class="settings-nav">
              ${SECTIONS.map(([k, l]) => `
                <button class="${tab === k ? 'active' : ''}" data-settings-tab="${k}">${l}</button>
              `).join('')}
            </nav>
            <div>
              ${tab === 'appearance'    ? sectionAppearance(s)    : ''}
              ${tab === 'behaviour'     ? sectionBehaviour(s)     : ''}
              ${tab === 'notifications' ? sectionNotifications(s) : ''}
              ${tab === 'admin'         ? sectionAdmin(s)         : ''}
              ${tab === 'data'          ? sectionData(s)          : ''}
              ${tab === 'account'       ? sectionAccount(s)       : ''}
              ${tab === 'about'         ? sectionAbout(s)         : ''}
              ${tab === 'help'          ? sectionHelp(s)          : ''}
            </div>
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
            <span class="name">${Utils.esc(user.name)} <span class="badge accent" style="font-size:.6rem;margin-left:4px;">MGR</span></span>
          </div>
        </div>
      </header>
    `;
  }

  function sectionAppearance(s) {
    const p = s.prefs;
    return `
      <section class="setting-section">
        <div class="section-title">
          <div><h2>Appearance</h2><p class="muted">Visual preferences for your account.</p></div>
        </div>

        <div class="setting-row">
          <div><strong>Theme</strong><small>Light, dark, or follow the system</small></div>
          <select data-pref="theme">
            ${[['system','System'],['light','Light'],['dark','Dark']].map(([v, l]) =>
              `<option value="${v}" ${p.theme === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>

        <div class="setting-row">
          <div><strong>True Black (AMOLED)</strong><small>Pure #000000 in dark mode</small></div>
          ${toggle('amoled', p.amoled)}
        </div>
        <div class="setting-row">
          <div><strong>Compact mode</strong><small>Reduce padding across the app</small></div>
          ${toggle('compact', p.compact)}
        </div>
        <div class="setting-row">
          <div><strong>High contrast</strong><small>Increase border and label contrast</small></div>
          ${toggle('contrast', p.contrast)}
        </div>
        <div class="setting-row">
          <div><strong>Accent colour</strong><small>Active state and primary buttons</small></div>
          <div class="accent-swatches">
            ${Object.entries(ACCENTS).map(([k, hex]) => `
              <button type="button" data-pref-accent="${k}"
                      class="${p.accent === k ? 'active' : ''}"
                      style="background:${hex};" aria-label="${k}"></button>
            `).join('')}
          </div>
        </div>
        <div class="setting-row">
          <div><strong>Font size</strong><small>Accessibility setting</small></div>
          <select data-pref="font">
            ${[['small','Small'],['medium','Medium'],['large','Large']].map(([v, l]) =>
              `<option value="${v}" ${p.font === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
      </section>
    `;
  }

  function sectionBehaviour(s) {
    const p = s.prefs;
    return `
      <section class="setting-section">
        <div class="section-title">
          <div><h2>App behaviour</h2><p class="muted">Personal preferences only.</p></div>
        </div>

        <div class="setting-row">
          <div><strong>My display preference</strong><small>Affects only your own screen</small></div>
          <select data-pref="period">
            <option value="weekly"  ${p.period === 'weekly'  ? 'selected' : ''}>Weekly</option>
            <option value="monthly" ${p.period === 'monthly' ? 'selected' : ''}>Monthly</option>
          </select>
        </div>
        <div class="setting-row">
          <div><strong>Default sort order</strong><small>Used on list screens</small></div>
          <select data-pref="defaultSort">
            <option value="newest" ${p.defaultSort === 'newest' ? 'selected' : ''}>Newest first</option>
            <option value="oldest" ${p.defaultSort === 'oldest' ? 'selected' : ''}>Oldest first</option>
            <option value="alpha"  ${p.defaultSort === 'alpha'  ? 'selected' : ''}>A–Z</option>
          </select>
        </div>
        <div class="setting-row">
          <div><strong>Performance mode</strong><small>Reduce animations</small></div>
          ${toggle('performance', p.performance)}
        </div>
        <div class="setting-row">
          <div><strong>Haptic feedback</strong><small>Vibration on actions</small></div>
          ${toggle('haptic', p.haptic)}
        </div>
      </section>

      <section class="setting-section">
        <div class="section-title"><h2>Sync</h2></div>
        <div class="setting-row">
          <div>
            <strong>Last synced</strong>
            <small>${s.app.lastSynced ? Utils.fmtDateTime(s.app.lastSynced) : 'Not synced yet'} · Queued: ${s.app.queuedChanges || 0}</small>
          </div>
          <button class="btn small" data-action="sync">Sync now</button>
        </div>
        <div class="setting-row">
          <div><strong>Sync on Wi-Fi only</strong><small>Queue until Wi-Fi available</small></div>
          ${toggle('wifiOnly', s.app.wifiOnly)}
        </div>
      </section>
    `;
  }

  function sectionNotifications(s) {
    const n = s.notifications || {};
    const toggles = [
      ['pending',  'Pending payment reminders', 'Jab payment pending ho'],
      ['aging',    'Aging stock alerts', 'Koi quality 10+ din incomplete'],
      ['report',   'Weekly / monthly report summary', 'Auto digest'],
      ['backup',   'Backup reminders', 'Reminders for schedules'],
      ['approval', 'New approval requests', 'Quality/colour submission waiting'],
      ['newUser',  'New user added', 'Confirmation when account created'],
      ['push',     'Push channel', 'In-app notifications'],
      ['email',    'Email channel', 'Delivery to your email'],
    ];

    return `
      <section class="setting-section">
        <div class="section-title">
          <div><h2>Notifications</h2><p class="muted">Includes Manager-only approval alerts.</p></div>
          <button class="btn small" data-page="notifications">Open full page</button>
        </div>
        ${toggles.map(([k, label, desc]) => `
          <div class="setting-row">
            <div><strong>${Utils.esc(label)}</strong><small>${Utils.esc(desc)}</small></div>
            ${toggle('notification.' + k, n[k])}
          </div>
        `).join('')}
        <div class="setting-row">
          <div><strong>Notification email</strong><small>Where emails go</small></div>
          <input type="email" data-pref="notification.emailAddress"
                 value="${Utils.esc(n.emailAddress || '')}" placeholder="your@email.com"
                 aria-label="Notification email" />
        </div>
        <div class="setting-row">
          <div><strong>Quiet hours</strong><small>No notifications in this window</small></div>
          <div class="row" style="gap:6px;">
            <input type="time" data-pref="notification.quietFrom" value="${Utils.esc(n.quietFrom || '22:00')}"
                   aria-label="Quiet hours start" />
            <input type="time" data-pref="notification.quietTo"   value="${Utils.esc(n.quietTo   || '06:00')}"
                   aria-label="Quiet hours end" />
          </div>
        </div>
      </section>
    `;
  }

  function sectionAdmin(s) {
    const pending = MasterData.pendingCount();
    const twoFAEnforced = s._globalSettings?.twoFAEnforced;
    return `
      <section class="setting-section">
        <div class="section-title">
          <div><h2>⭐ Global settings</h2><p class="muted">Shared across every account. Changes affect everyone.</p></div>
        </div>

        <div class="setting-row">
          <div>
            <strong>Tracking period</strong>
            <small>Default for every user's dashboard/report labels</small>
          </div>
          <select data-global="trackingPeriod">
            <option value="weekly"  ${(s._globalSettings?.trackingPeriod || 'weekly') === 'weekly'  ? 'selected' : ''}>Weekly</option>
            <option value="monthly" ${(s._globalSettings?.trackingPeriod || 'weekly') === 'monthly' ? 'selected' : ''}>Monthly</option>
          </select>
        </div>

        <div class="setting-row">
          <div>
            <strong>2FA enforcement <span class="badge pending" style="font-size:.6rem;margin-left:4px;">Coming soon</span></strong>
            <small>Requires backend. Not functional yet — toggle is disabled until 2FA flow is built.</small>
          </div>
          <button class="switch ${twoFAEnforced ? 'on' : ''}" type="button"
                  aria-pressed="${!!twoFAEnforced}" disabled
                  style="opacity:.5;cursor:not-allowed;">
            <span></span>
          </button>
        </div>
      </section>

      <section class="setting-section">
        <div class="section-title">
          <div><h2>⭐ User management</h2><p class="muted">Create, activate, deactivate accounts. No delete — ever.</p></div>
        </div>
        <div class="setting-row">
          <div>
            <strong>Users</strong>
            <small>${s._users?.length || 0} account${(s._users?.length || 0) === 1 ? '' : 's'} on this device</small>
          </div>
          <button class="btn small primary" data-page="users">Open →</button>
        </div>
      </section>

      <section class="setting-section">
        <div class="section-title">
          <div><h2>⭐ Approvals</h2><p class="muted">Quality &amp; Colour Master submissions from Users</p></div>
        </div>
        <div class="setting-row">
          <div>
            <strong>Pending approvals</strong>
            <small>${pending === 0 ? 'All caught up' : `${pending} waiting`}</small>
          </div>
          <button class="btn small ${pending > 0 ? 'primary' : ''}" data-page="approvals">
            Review${pending > 0 ? ` (${pending})` : ''} →
          </button>
        </div>
      </section>

      <section class="setting-section">
        <div class="section-title">
          <div><h2>⭐ Import data</h2><p class="muted">Bulk-import Quality / Colour master via JSON</p></div>
        </div>
        <div class="setting-row">
          <div>
            <strong>Upload master data</strong>
            <small>Merge mode — existing items skipped, new items added</small>
          </div>
          <label class="btn small" style="display:inline-block;">
            ⬆ Import JSON
            <input type="file" accept=".json" data-import-master style="display:none" />
          </label>
        </div>
        <div class="setting-row">
          <div><strong>Expected format</strong><small>See example below</small></div>
        </div>
        <pre style="background:var(--surface-2);padding:12px;border-radius:var(--radius-sm);font-size:.72rem;overflow:auto;margin-top:4px;">{
  "qualities": {
    "Bra":   [{ "name": "BEAUTYBOX", "price": 25 }],
    "Panty": [{ "name": "ICE-PANTY", "price": 15 }]
  },
  "colors": [
    { "name": "Red", "hex": "#ef5350" }
  ]
}</pre>
      </section>

      <section class="setting-section">
        <div class="section-title">
          <div><h2>⭐ Audit log</h2><p class="muted">Every action across every account</p></div>
        </div>
        <div class="setting-row">
          <div>
            <strong>System-wide activity</strong>
            <small>Filterable by date range, user, action type · export only</small>
          </div>
          <button class="btn small" data-page="auditLog">Open →</button>
        </div>
        ${renderAuditPreview()}
      </section>
    `;
  }

  function renderAuditPreview() {
    const logs = (Store.get()._auditLog || []).slice().sort((a, b) =>
      (b.at || '').localeCompare(a.at || '')).slice(0, 3);

    if (!logs.length) return `<div class="hint" style="padding:8px 0;">No activity yet.</div>`;

    const rows = logs.map(l => `
      <div class="history-row" style="margin-top:6px;">
        <span class="muted">${Utils.esc(actionLabel(l.action))}</span>
        <span>${Utils.esc(l.detail || '')}</span>
        <span class="muted">${Utils.ago(l.at)}</span>
      </div>
    `).join('');

    return `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line);">
        <div class="hint" style="font-weight:800;letter-spacing:.05em;text-transform:uppercase;font-size:.68rem;margin-bottom:4px;">
          Recent activity
        </div>
        ${rows}
      </div>
    `;
  }

  function actionLabel(code) {
    const map = {
      LOGIN: 'Login', LOGOUT: 'Logout',
      RECORD_CREATED: 'Record created', RECORD_EDITED: 'Record edited',
      RECORD_COMPLETED: 'Record completed', RECORD_ARCHIVED: 'Record archived',
      RECORD_ARCHIVED_BY_MANAGER: 'Record archived (MGR)',
      RECORD_RESTORED: 'Record restored', RECORD_DELETED_FOREVER: 'Record deleted',
      PAYMENT_ADDED: 'Payment added', PAYMENT_EDITED: 'Payment edited', PAYMENT_ARCHIVED: 'Payment archived',
      USER_CREATED: 'User created', USER_ACTIVATED: 'User activated', USER_DEACTIVATED: 'User deactivated',
      PASSWORD_CHANGED: 'Password changed', PASSWORD_RESET: 'Password reset',
      MASTER_SUBMITTED: 'Master submitted', MASTER_APPROVED: 'Master approved',
      MASTER_REJECTED: 'Master rejected', MASTER_DEACTIVATED: 'Master deactivated',
      MASTER_REACTIVATED: 'Master reactivated', MASTER_PRICE_UPDATED: 'Master price updated',
      MASTER_IMPORTED: 'Master imported',
      BACKUP_CREATED: 'Backup created', BACKUP_RESTORED: 'Backup restored',
      GLOBAL_SETTING_CHANGED: 'Global setting changed',
      PROBLEM_REPORTED: 'Problem reported',
    };
    return map[code] || code;
  }

  function sectionData(s) {
    const totalRecords = (s._records || []).filter(r => !r.archived).length;
    const totalArchived = (s._records || []).filter(r => r.archived).length;

    return `
      <section class="setting-section">
        <div class="section-title">
          <div><h2>Data (all users)</h2><p class="muted">Manager has oversight on every user's data.</p></div>
        </div>

        <div class="setting-row">
          <div><strong>Active records</strong><small>${totalRecords} across all users</small></div>
        </div>
        <div class="setting-row">
          <div><strong>Archive / Recycle Bin</strong><small>${totalArchived} archived items · all users</small></div>
          <button class="btn small" data-page="archive">Open →</button>
        </div>
        <div class="setting-row">
          <div><strong>Backup &amp; restore</strong><small>All-users combined backup</small></div>
          <button class="btn small" data-page="backup">Open →</button>
        </div>
        <div class="setting-row">
          <div><strong>Export records as CSV</strong><small>One row per quality record — all users</small></div>
          <button class="btn small" data-action="export">Export</button>
        </div>
      </section>
    `;
  }

  function sectionAccount(s) {
    const user = s.session || {};
    return `
      <section class="setting-section">
        <div class="section-title"><h2>Account</h2></div>
        <div class="setting-row">
          <div>
            <strong>${Utils.esc(user.name || '—')}</strong>
            <small>Role: ${Utils.esc(user.role || '—')} · Phone: ${Utils.esc(user.phone || '—')}</small>
          </div>
          <button class="btn small" data-action="change-password">Change password</button>
        </div>
        <div class="notice">
          Forgot your password? Ask another Manager. There is no self-service reset.
        </div>
      </section>
    `;
  }

  function sectionAbout() {
    return `
      <section class="setting-section">
        <div class="section-title"><h2>About</h2></div>
        <div class="setting-row"><div><strong>App version</strong><small>1.0.0</small></div></div>
        <div class="setting-row"><div><strong>Build</strong><small>2026.09.29</small></div></div>
        <div class="setting-row"><div><strong>Last updated</strong><small>29 Sep 2026</small></div></div>
        <div class="setting-row"><div><strong>Role</strong><small>Manager</small></div></div>
      </section>
    `;
  }

  function sectionHelp() {
    const faqs = [
      ['Naya user kaise banaun?',
       'Settings → Admin → User management → Add user. Manager sets password directly.'],
      ['Kisi user ka password reset kaise karein?',
       'User management me us user ko open karke "Reset password" tap karein.'],
      ['Kisi user ko delete kaise karein?',
       'Delete nahi hota. Sirf Deactivate karein — account ka data intact rehta hai.'],
      ['Audit log clear kar sakte hain?',
       'Nahi. Audit log clear karne ka option deliberately nahi hai. Sirf export hota hai.'],
    ];
    return `
      <section class="setting-section">
        <div class="section-title">
          <div><h2>Help &amp; support</h2><p class="muted">Manager-specific answers.</p></div>
        </div>
        <div class="search" style="margin-bottom:14px;">
          <span class="icon">⌕</span>
          <label for="help-search" class="sr-only">Search help topics</label>
          <input id="help-search" placeholder="Search help topics…" />
        </div>
        <div id="help-faq-list">
          ${faqs.map(([q, a]) => `
            <details style="padding:12px 0;border-bottom:1px solid var(--line);">
              <summary style="cursor:pointer;font-weight:700;font-size:.88rem;">${Utils.esc(q)}</summary>
              <p class="muted" style="font-size:.82rem;line-height:1.55;margin-top:8px;">${Utils.esc(a)}</p>
            </details>
          `).join('')}
        </div>
      </section>
    `;
  }

  function toggle(key, on) {
    return `<button class="switch ${on ? 'on' : ''}" type="button"
                    data-toggle="${Utils.esc(key)}" aria-pressed="${!!on}">
              <span></span>
            </button>`;
  }

  async function persistPrefs() {
    const s = Store.get();
    await DB.setPrefs(s.session.userId, s.prefs);
  }
  async function persistNotifications() {
    const s = Store.get();
    await DB.setNotifications(s.session.userId, s.notifications);
  }

  async function importMasterData(parsed) {
    const s = Store.get();
    let qAdded = 0, qSkipped = 0, cAdded = 0, cSkipped = 0;

    if (parsed.qualities) {
      for (const [type, list] of Object.entries(parsed.qualities)) {
        for (const q of list) {
          const existing = MasterData.findQuality(type, q.name);
          if (existing) { qSkipped++; continue; }
          const r = await MasterData.submitQuality({
            type, name: q.name, price: q.price,
            submittedBy: s.session.userId,
            submittedByName: s.session.name,
          });
          if (!r.ok) { qSkipped++; continue; }
          await MasterData.approveQuality(type, q.name, s.session.userId, s.session.name);
          qAdded++;
        }
      }
    }
    if (parsed.colors) {
      for (const c of parsed.colors) {
        const existing = MasterData.findColor(c.name);
        if (existing) { cSkipped++; continue; }
        const r = await MasterData.submitColor({
          name: c.name, hex: c.hex,
          submittedBy: s.session.userId,
          submittedByName: s.session.name,
        });
        if (!r.ok) { cSkipped++; continue; }
        await MasterData.approveColor(c.name, s.session.userId, s.session.name);
        cAdded++;
      }
    }
    await Auth.logAudit(s.session.userId, s.session.name, 'MASTER_IMPORTED',
      `${qAdded} qualities, ${cAdded} colours · ${qSkipped + cSkipped} skipped`);
    return { qualities: qAdded, colors: cAdded, skipped: qSkipped + cSkipped };
  }

  async function downloadBackup() {
    const s = Store.get();
    const snapshot = {
      version: 1,
      exportedAt: Utils.nowISO(),
      exportedBy: { id: s.session.userId, name: s.session.name },
      scope: 'manager-all-users',
      data: {
        records: s._records || [],
        payments: s._payments || [],
        users: s._users || [],
        masters: {
          qualities: MasterData.getAllQualities(),
          colors: MasterData.getAllColors(),
        },
      },
    };
    const backupId = Utils.uid('B');
    await DB.put('backups', {
      id: backupId, type: 'Manual',
      timestamp: snapshot.exportedAt,
      size: JSON.stringify(snapshot).length,
      scope: 'manager-all-users', ownerId: s.session.userId,
      recordCount: snapshot.data.records.length,
      paymentCount: snapshot.data.payments.length,
    });
    await DB.put('backupSnapshots', { id: backupId, value: snapshot });

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alishan-manager-backup-${Utils.todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    await Auth.logAudit(s.session.userId, s.session.name, 'BACKUP_CREATED',
      `manager-all-users · ${snapshot.data.records.length} records`);
    Toast.success('Backup downloaded.');
  }

  function exportCSV() {
    const s = Store.get();
    const records = (s._records || []).filter(r => !r.archived);
    const head = ['Quality ID','Quality','Owner','Type','Cup','Colours','Dozen',
                  'Price/dozen','Amount','Received','Pending','Payment Status',
                  'Status','Lot','Entry date','Notes'];
    const lines = [head, ...records.map(r => {
      const c = Calc.compute(r);
      const rec = Calc.totalReceived(r, s._payments || []);
      return [
        r.id, r.quality, r.ownerName || r.ownerId, r.type, r.cup,
        r.colors.join(', '), c.totalDozen.toFixed(2), r.priceSnapshot,
        c.amount, rec, Math.max(0, c.amount - rec),
        Calc.paymentStatus(r, s._payments || []),
        r.status, r.lot || '', r.entryDate, r.notes || '',
      ];
    })].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([lines], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alishan-all-records-${Utils.todayISO()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Toast.success('CSV downloaded.');
  }

  function openChangePassword() {
    Modal.open({
      title: 'Change password',
      text: 'Minimum 6 characters.',
      body: `
        <div class="field"><label for="cp-current">Current password</label>
          <input id="cp-current" type="password" autocomplete="current-password" /></div>
        <div class="field" style="margin-top:12px"><label for="cp-new">New password</label>
          <input id="cp-new" type="password" minlength="6" autocomplete="new-password" /></div>
        <div class="field" style="margin-top:12px"><label for="cp-confirm">Confirm new password</label>
          <input id="cp-confirm" type="password" autocomplete="new-password" /></div>
      `,
      confirmLabel: 'Update password',
      onConfirm: async (modal) => {
        const cur  = modal.querySelector('#cp-current').value;
        const next = modal.querySelector('#cp-new').value;
        const conf = modal.querySelector('#cp-confirm').value;
        const r = await Auth.changePassword(Store.currentUserId(), cur, next, conf);
        if (!r.ok) { Toast.error(r.error); return false; }
        Toast.success('Password updated.');
        return true;
      },
    });
  }

  function mount(root) {
    Utils.$$('[data-nav]', root).forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.nav;
      if (p === 'settings') return;
      Router.go(p);
    }));

    Utils.$$('[data-action="sync"]', root).forEach(b =>
      b.addEventListener('click', () => Sync.triggerSync()));

    Utils.$$('[data-page]', root).forEach(b => b.addEventListener('click', () => Router.go(b.dataset.page)));

    Utils.$$('[data-settings-tab]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: { settingsTab: b.dataset.settingsTab }})));

    Utils.$$('[data-pref]', root).forEach(el => {
      const key = el.dataset.pref;
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, async () => {
        const s = Store.get();
        const value = el.value;
        if (key.startsWith('notification.')) {
          const k = key.split('.')[1];
          const next = { ...s.notifications, [k]: value };
          Store.set({ notifications: next });
          await persistNotifications();
        } else {
          const next = { ...s.prefs, [key]: value };
          Store.set({ prefs: next });
          await persistPrefs();
          applyPrefsFromStore();
        }
      });
    });

    Utils.$$('[data-global]', root).forEach(el => {
      el.addEventListener('change', async () => {
        const key = el.dataset.global;
        const val = el.value;
        const s = Store.get();
        const next = { ...(s._globalSettings || {}), [key]: val };
        Store.set({ _globalSettings: next });
        await DB.setGlobal(next);
        await Auth.logAudit(s.session.userId, s.session.name, 'GLOBAL_SETTING_CHANGED', `${key} = ${val}`);
        Toast.success('Global setting updated.');
      });
    });

    Utils.$$('[data-toggle]', root).forEach(b =>
      b.addEventListener('click', async () => {
        const key = b.dataset.toggle;
        const s = Store.get();
        if (key.startsWith('notification.')) {
          const k = key.split('.')[1];
          const next = { ...s.notifications, [k]: !s.notifications[k] };
          Store.set({ notifications: next });
          await persistNotifications();
        } else if (key === 'wifiOnly') {
          Store.set({ app: { ...s.app, wifiOnly: !s.app.wifiOnly }});
        } else {
          const next = { ...s.prefs, [key]: !s.prefs[key] };
          Store.set({ prefs: next });
          await persistPrefs();
          applyPrefsFromStore();
        }
        Router.render();
      }));

    Utils.$$('[data-pref-accent]', root).forEach(b =>
      b.addEventListener('click', async () => {
        const s = Store.get();
        const next = { ...s.prefs, accent: b.dataset.prefAccent };
        Store.set({ prefs: next });
        await persistPrefs();
        applyPrefsFromStore();
        Router.render();
      }));

    Utils.$$('[data-action="logout"]', root).forEach(b =>
      b.addEventListener('click', async () => {
        await Auth.logout();
        Store.set({ session: null, route: 'login' });
        Toast.show('Logged out.');
        Router.go('login');
      }));

    Utils.$$('[data-action="change-password"]', root).forEach(b =>
      b.addEventListener('click', openChangePassword));

    Utils.$$('[data-action="backup-now"]', root).forEach(b =>
      b.addEventListener('click', downloadBackup));

    Utils.$$('[data-action="export"]', root).forEach(b =>
      b.addEventListener('click', exportCSV));

    Utils.$$('[data-import-master]', root).forEach(input =>
      input.addEventListener('change', async e => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        const text = await f.text();
        const parsed = JSONImport.parseMasterJSON(text);
        if (!parsed.ok) { Toast.error(parsed.error); return; }
        const summary = await importMasterData(parsed);
        Toast.success(`Import complete · ${summary.qualities} qualities, ${summary.colors} colours added.`);
        Router.render();
      }));

    const helpSearch = Utils.$('#help-search', root);
    if (helpSearch) {
      helpSearch.addEventListener('input', () => {
        const q = Utils.normalize(helpSearch.value);
        Utils.$$('#help-faq-list details', root).forEach(det => {
          const text = Utils.normalize(det.textContent);
          det.style.display = (!q || text.includes(q)) ? '' : 'none';
        });
      });
    }
  }

  function applyPrefsFromStore() {
    const p = Store.get().prefs;
    const html = document.documentElement;
    const theme = p.theme === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : p.theme;
    html.dataset.theme    = theme;
    html.dataset.amoled   = (theme === 'dark' && p.amoled) ? 'true' : 'false';
    html.dataset.compact  = p.compact ? 'true' : 'false';
    html.dataset.contrast = p.contrast ? 'true' : 'false';
    html.dataset.font     = p.font || 'medium';
    html.dataset.performance = p.performance ? 'true' : 'false';
    html.style.setProperty('--accent', ACCENTS[p.accent] || ACCENTS.blue);
  }

  return { render, mount };
})();

window.ManagerSettingsPage = ManagerSettingsPage;