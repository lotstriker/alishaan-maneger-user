/* ============================================================
   ALISHAN · SETTINGS PAGE (User App)
   Personal preferences (per-user) + My Data + About + Help.
   ============================================================ */

const SettingsPage = (() => {

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
    ['data',          'My data'],
    ['account',       'Account'],
    ['about',         'About'],
    ['help',          'Help & support'],
  ];

  function render() {
    const s = Store.get();
    const user = s.session || { name: 'User', role: 'User' };
    const tab = s.ui.settingsTab || 'appearance';

    return `
      <div class="app-shell">
        ${TopBar(user, s)}
        <main class="page-content">
          <div class="page-head">
            <div>
              <div class="eyebrow">User app · preferences</div>
              <h1>Settings</h1>
              <p class="muted">Only your personal preferences and your own data are shown here.</p>
            </div>
            <button class="btn danger" data-action="logout">Log out</button>
          </div>

          <div class="card" style="padding:14px;margin-top:0;">
            <div class="setting-row" style="border:0;padding:0;">
              <div>
                <strong>Quick actions</strong>
                <small>Backup, export and import are scoped to your own account.</small>
              </div>
              <div class="quick-actions">
                <button class="btn small" data-action="backup-now">Backup now</button>
                <button class="btn small" data-action="export">Export CSV</button>
                <label class="btn small" style="display:inline-block;">
                  Import
                  <input type="file" accept=".json" data-restore style="display:none" />
                </label>
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
            <span class="name">${Utils.esc(user.name)}</span>
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
          <div><h2>Appearance</h2><p class="muted">Visual preferences are saved per account.</p></div>
        </div>

        <div class="setting-row">
          <div><strong>Theme</strong><small>Light, dark, or follow the system</small></div>
          <select data-pref="theme">
            ${[['system','System'],['light','Light'],['dark','Dark']].map(([v, l]) =>
              `<option value="${v}" ${p.theme === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>

        <div class="setting-row">
          <div><strong>True Black (AMOLED)</strong><small>Pure #000000 background</small></div>
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
          <div><strong>Accent colour</strong><small>Used for active states and primary buttons</small></div>
          <div class="accent-swatches">
            ${Object.entries(ACCENTS).map(([k, hex]) => `
              <button type="button" data-pref-accent="${k}"
                      class="${p.accent === k ? 'active' : ''}"
                      style="background:${hex};"
                      aria-label="${k}"></button>
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

        <div class="setting-row">
          <div><strong>Language</strong><small>Designed for English / Hindi</small></div>
          <select data-pref="language">
            <option value="English" ${p.language === 'English' ? 'selected' : ''}>English</option>
            <option value="Hindi"   ${p.language === 'Hindi'   ? 'selected' : ''}>Hindi</option>
          </select>
        </div>
      </section>
    `;
  }

  function sectionBehaviour(s) {
    const p = s.prefs;
    const monthly = p.period === 'monthly';
    const active = s.app;

    return `
      <section class="setting-section">
        <div class="section-title">
          <div><h2>App behaviour</h2><p class="muted">Personal-only preferences. Never affect other users.</p></div>
        </div>

        <div class="setting-row">
          <div><strong>My display preference</strong><small>Weekly or monthly — affects only what you see</small></div>
          <select data-pref="period">
            <option value="weekly"  ${!monthly ? 'selected' : ''}>Weekly</option>
            <option value="monthly" ${monthly  ? 'selected' : ''}>Monthly</option>
          </select>
        </div>

        <div class="setting-row">
          <div><strong>Default quantity mode</strong><small>Pre-selects this choice in Add Quality</small></div>
          <select data-pref="defaultMode">
            <option value="same"      ${p.defaultMode === 'same'      ? 'selected' : ''}>Same for all colours</option>
            <option value="different" ${p.defaultMode === 'different' ? 'selected' : ''}>Different by colour</option>
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
          <div><strong>Haptic feedback</strong><small>Small vibration on key actions</small></div>
          ${toggle('haptic', p.haptic)}
        </div>

        <div class="setting-row">
          <div><strong>Performance mode</strong><small>Reduce animations for older/slower devices</small></div>
          ${toggle('performance', p.performance)}
        </div>

        <div class="setting-row">
          <div><strong>Manage notifications</strong><small>Pending, aging, reports, backup alerts</small></div>
          <button class="btn small" data-page="notifications">Manage →</button>
        </div>
      </section>

      <section class="setting-section">
        <div class="section-title">
          <div><h2>Sync</h2><p class="muted">Changes save locally first, sync when online.</p></div>
        </div>
        <div class="setting-row">
          <div>
            <strong>Last synced</strong>
            <small>${active.lastSynced ? Utils.fmtDateTime(active.lastSynced) : 'Not synced yet'} · Queued: ${active.queuedChanges || 0}</small>
          </div>
          <button class="btn small" data-action="sync">Sync now</button>
        </div>
        <div class="setting-row">
          <div><strong>Sync on Wi-Fi only</strong><small>Keep local writes queued until Wi-Fi is available</small></div>
          ${toggle('wifiOnly', active.wifiOnly)}
        </div>
      </section>
    `;
  }

  function sectionNotifications(s) {
    const n = s.notifications || {};
    return `
      <section class="setting-section">
        <div class="section-title">
          <div><h2>Notifications</h2><p class="muted">Push and email only. Quiet hours apply to every event.</p></div>
          <button class="btn small" data-page="notifications">Open full page</button>
        </div>

        <div class="setting-row">
          <div><strong>Pending payment reminders</strong><small>Jab payment kai din se pending ho</small></div>
          ${toggle('notification.pending', n.pending)}
        </div>
        <div class="setting-row">
          <div><strong>Aging stock alerts</strong><small>Koi quality 10+ din se incomplete ho</small></div>
          ${toggle('notification.aging', n.aging)}
        </div>
        <div class="setting-row">
          <div><strong>Weekly / monthly report summary</strong><small>Auto digest based on your display preference</small></div>
          ${toggle('notification.report', n.report)}
        </div>
        <div class="setting-row">
          <div><strong>Backup reminders</strong><small>Reminders for backup schedules</small></div>
          ${toggle('notification.backup', n.backup)}
        </div>
        <div class="setting-row">
          <div><strong>Push channel</strong><small>In-app notifications</small></div>
          ${toggle('notification.push', n.push)}
        </div>
        <div class="setting-row">
          <div><strong>Email channel</strong><small>Delivery to your notification email</small></div>
          ${toggle('notification.email', n.email)}
        </div>
        <div class="setting-row">
          <div><strong>Notification email</strong><small>Where emails go (if email channel is on)</small></div>
          <input type="email" data-pref="notification.emailAddress"
                 value="${Utils.esc(n.emailAddress || '')}"
                 placeholder="your@email.com"
                 aria-label="Notification email" />
        </div>
        <div class="setting-row">
          <div><strong>Quiet hours</strong><small>No notifications sent between these times</small></div>
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

  function sectionData(s) {
    const uid = s.session.userId;
    const archived = (s._records || []).filter(r => r.archived && r.ownerId === uid).length;
    const active = (s._records || []).filter(r => !r.archived && r.ownerId === uid).length;

    return `
      <section class="setting-section">
        <div class="section-title">
          <div><h2>My data</h2><p class="muted">Your local offline copy belongs to this account.</p></div>
        </div>

        <div class="notice" style="margin-bottom:12px;">
          IndexedDB stores your records locally. New records save offline first, then sync when online.
        </div>

        <div class="setting-row">
          <div><strong>Active records</strong><small>${active} record${active === 1 ? '' : 's'} owned by you</small></div>
        </div>
        <div class="setting-row">
          <div><strong>My Archive</strong><small>${archived} archived item${archived === 1 ? '' : 's'} · nothing auto-expires</small></div>
          <button class="btn small" data-page="archive">Open →</button>
        </div>
        <div class="setting-row">
          <div><strong>Backup &amp; restore</strong><small>Download or restore your own data (full replace, not merge)</small></div>
          <button class="btn small" data-page="backup">Open →</button>
        </div>
        <div class="setting-row">
          <div><strong>Submit master data</strong><small>Propose a new quality or colour — Manager approves before it appears</small></div>
          <button class="btn small" data-action="submit-master">＋ Submit</button>
        </div>
        <div class="setting-row">
          <div><strong>Export records as CSV</strong><small>One row per quality record — Excel-compatible</small></div>
          <button class="btn small" data-action="export">Export</button>
        </div>
      </section>
    `;
  }

  function sectionAccount(s) {
    const user = s.session || {};
    return `
      <section class="setting-section">
        <div class="section-title">
          <div><h2>Account</h2><p class="muted">Details from your Manager-registered account.</p></div>
        </div>
        <div class="setting-row">
          <div>
            <strong>${Utils.esc(user.name || '—')}</strong>
            <small>Role: ${Utils.esc(user.role || '—')} · Phone: ${Utils.esc(user.phone || '—')}</small>
          </div>
          <button class="btn small" data-action="change-password">Change password</button>
        </div>
        <div class="notice">
          Forgot your password? Ask your Manager to reset it. There is no self-service reset.
        </div>
      </section>
    `;
  }

  function sectionAbout() {
    return `
      <section class="setting-section">
        <div class="section-title"><div><h2>About</h2><p class="muted">App information</p></div></div>
        <div class="setting-row"><div><strong>App version</strong><small>1.0.0</small></div></div>
        <div class="setting-row"><div><strong>Build</strong><small>2026.09.29</small></div></div>
        <div class="setting-row"><div><strong>Last updated</strong><small>29 Sep 2026</small></div></div>
        <div class="setting-row">
          <div><strong>Help &amp; support</strong><small>Answers for common questions</small></div>
          <button class="btn small" data-settings-tab="help">Open →</button>
        </div>
      </section>
    `;
  }

  function sectionHelp() {
    const faqs = [
      ['Naya quality kaise add karu?',
       'Settings → My data → Submit. Manager approve karega, phir dropdown mein dikhega.'],
      ['Lot number add kaise karein?',
       'Record expand karke Edit tap karein. Lot number sirf Edit me add hota hai, creation me nahi.'],
      ['Galti se delete ho gaya, wapas kaise laun?',
       'Settings → My data → My Archive me jaakar Restore karein. Kabhi auto-expire nahi hota.'],
      ['Password bhool gaya, kya karu?',
       'Manager se naya password set karwaein. App me self-service reset nahi hai.'],
    ];
    return `
      <section class="setting-section">
        <div class="section-title">
          <div><h2>Help &amp; support</h2><p class="muted">Short answers for the real Alishan workflow.</p></div>
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
        <div class="notice" style="margin-top:16px;">
          Account or password issues → contact your Manager directly.<br />
          App bugs or technical issues → support email.
        </div>
        <button class="btn" data-action="report-problem" style="margin-top:12px;">Report a problem</button>
      </section>
    `;
  }

  function toggle(key, on) {
    return `<button class="switch ${on ? 'on' : ''}" type="button"
                    data-toggle="${Utils.esc(key)}" aria-pressed="${!!on}">
              <span></span>
            </button>`;
  }

  function openChangePassword() {
    Modal.open({
      title: 'Change password',
      text: 'Minimum 6 characters. No complex rules — keep it simple.',
      body: `
        <div class="field"><label for="cp-current">Current password</label>
          <input id="cp-current" type="password" autocomplete="current-password" /></div>
        <div class="field" style="margin-top:12px"><label for="cp-new">New password</label>
          <input id="cp-new" type="password" autocomplete="new-password" minlength="6" /></div>
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

  function openSubmitMaster() {
    Modal.open({
      title: 'Submit master data',
      text: 'Manager approval required before it appears in pickers.',
      body: `
        <div class="field"><label for="sm-kind">Kind</label>
          <select id="sm-kind"><option value="Quality">Quality</option><option value="Colour">Colour</option></select></div>
        <div class="field" style="margin-top:12px" id="sm-type-wrap">
          <label for="sm-type">Quality category</label>
          <select id="sm-type"><option>Bra</option><option>Panty</option><option>Set</option><option>Blouse</option></select>
        </div>
        <div class="field" style="margin-top:12px"><label for="sm-name">Name</label>
          <input id="sm-name" placeholder="e.g. LAVENDER" /></div>
        <div class="field" style="margin-top:12px" id="sm-price-wrap">
          <label for="sm-price">Price per dozen (₹)</label>
          <input id="sm-price" type="number" min="0.01" step="0.01" placeholder="25" />
        </div>
        <div class="field" style="margin-top:12px;display:none;" id="sm-hex-wrap">
          <label for="sm-hex">Hex colour</label>
          <input id="sm-hex" placeholder="#8c969a" value="#8c969a" />
        </div>
      `,
      confirmLabel: 'Submit for approval',
      onConfirm: async (modal) => {
        const kind = modal.querySelector('#sm-kind').value;
        const name = modal.querySelector('#sm-name').value.trim();
        if (!name) { Toast.error('Name is required.'); return false; }
        const s2 = Store.get();
        let r;
        if (kind === 'Quality') {
          const type = modal.querySelector('#sm-type').value;
          const price = Number(modal.querySelector('#sm-price').value || 0);
          r = await MasterData.submitQuality({
            type, name, price,
            submittedBy: s2.session.userId, submittedByName: s2.session.name,
          });
        } else {
          const hex = modal.querySelector('#sm-hex').value.trim() || '#8c969a';
          r = await MasterData.submitColor({
            name, hex,
            submittedBy: s2.session.userId, submittedByName: s2.session.name,
          });
        }
        if (!r.ok) { Toast.error(r.error); return false; }
        Toast.success('Submitted for Manager approval.');
        return true;
      },
    });
    setTimeout(() => {
      const kindSel = Utils.$('#sm-kind');
      const priceWrap = Utils.$('#sm-price-wrap');
      const typeWrap = Utils.$('#sm-type-wrap');
      const hexWrap = Utils.$('#sm-hex-wrap');
      if (kindSel) {
        kindSel.addEventListener('change', () => {
          const isQuality = kindSel.value === 'Quality';
          if (priceWrap) priceWrap.style.display = isQuality ? '' : 'none';
          if (typeWrap)  typeWrap.style.display  = isQuality ? '' : 'none';
          if (hexWrap)   hexWrap.style.display   = isQuality ? 'none' : '';
        });
      }
    }, 60);
  }

  function openReportProblem() {
    Modal.open({
      title: 'Report a problem',
      text: 'Describe what happened. This is saved locally for now.',
      body: `
        <div class="field">
          <label for="rp-text">What happened?</label>
          <textarea id="rp-text" placeholder="Describe the issue…" style="min-height:100px;"></textarea>
        </div>
      `,
      confirmLabel: 'Send report',
      onConfirm: async (modal) => {
        const text = modal.querySelector('#rp-text').value.trim();
        if (!text) { Toast.error('Please describe the problem.'); return false; }
        const s = Store.get();
        await Auth.logAudit(s.session.userId, s.session.name, 'PROBLEM_REPORTED', text.slice(0, 200));
        Toast.success('Report saved locally.');
        return true;
      },
    });
  }

  async function downloadBackup() {
    const s = Store.get();
    const uid = s.session.userId;
    const snapshot = {
      version: 1,
      exportedAt: Utils.nowISO(),
      exportedBy: { id: uid, name: s.session.name },
      scope: 'user',
      data: {
        records:  (s._records  || []).filter(r => r.ownerId === uid),
        payments: (s._payments || []).filter(p => (s._records || [])
          .some(r => r.id === p.recordId && r.ownerId === uid)),
        prefs:    s.prefs,
        notifications: s.notifications,
      },
    };
    const backupId = Utils.uid('B');
    await DB.put('backups', {
      id: backupId, type: 'Manual',
      timestamp: snapshot.exportedAt,
      size: JSON.stringify(snapshot).length,
      scope: 'user', ownerId: uid,
      recordCount: snapshot.data.records.length,
      paymentCount: snapshot.data.payments.length,
    });
    await DB.put('backupSnapshots', { id: backupId, value: snapshot });

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alishan-user-backup-${Utils.todayISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Toast.success('Backup downloaded.');
  }

  function exportCSV() {
    const s = Store.get();
    const uid = s.session.userId;
    const records = (s._records || []).filter(r => r.ownerId === uid && !r.archived);
    const payments = s._payments || [];
    const head = ['Quality ID','Quality','Type','Cup','Colours','Mode','Dozen',
                  'Price/dozen','Amount','Received','Pending','Payment Status',
                  'Status','Lot','Entry date','Notes'];
    const lines = [head, ...records.map(r => {
      const c = Calc.compute(r);
      const rec = Calc.totalReceived(r, payments);
      return [
        r.id, r.quality, r.type, r.cup, r.colors.join(', '), r.mode,
        c.totalDozen.toFixed(2), r.priceSnapshot, c.amount, rec,
        Math.max(0, c.amount - rec), Calc.paymentStatus(r, payments),
        r.status, r.lot || '', r.entryDate, r.notes || '',
      ];
    })].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([lines], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alishan-records-${Utils.todayISO()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Toast.success('CSV downloaded.');
  }

  async function restoreFromFile(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.data?.records || !Array.isArray(parsed.data.records)) {
        throw new Error('Invalid backup shape.');
      }
      const ok = await Modal.confirm({
        title: 'Restore backup?',
        text: 'This will OVERWRITE your current records. It does not merge.',
        confirmLabel: 'Restore (overwrite)',
        danger: true,
      });
      if (!ok) return;
      const s = Store.get();
      const uid = s.session.userId;
      const existingRecords = s._records || [];
      const toDeleteRecords = existingRecords.filter(r => r.ownerId === uid);
      const toDeletePayments = (s._payments || []).filter(p =>
        toDeleteRecords.some(r => r.id === p.recordId));
      for (const r of toDeleteRecords) await DB.del('records', r.id);
      for (const p of toDeletePayments) await DB.del('payments', p.id);
      for (const r of parsed.data.records) {
        r.ownerId = uid;
        r.ownerName = s.session.name;
        await DB.put('records', r);
      }
      for (const p of (parsed.data.payments || [])) {
        await DB.put('payments', p);
      }
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
      await DashboardPage.refreshData();
      Toast.success('Backup restored.');
    } catch (e) {
      console.error(e);
      Toast.error('Backup file is not valid.');
    }
  }

  async function persistPrefs() {
    const s = Store.get();
    await DB.setPrefs(s.session.userId, s.prefs);
  }

  async function persistNotifications() {
    const s = Store.get();
    await DB.setNotifications(s.session.userId, s.notifications);
  }

  function mount(root) {
    Utils.$$('[data-nav]', root).forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.nav;
      if (p === 'settings') return;
      Router.go(p);
    }));

    Utils.$$('[data-action="sync"]', root).forEach(b => b.addEventListener('click', () => Sync.triggerSync()));

    Utils.$$('[data-settings-tab]', root).forEach(b =>
      b.addEventListener('click', () => Store.set({ ui: { settingsTab: b.dataset.settingsTab }})));

    Utils.$$('[data-page]', root).forEach(b =>
      b.addEventListener('click', () => Router.go(b.dataset.page)));

    Utils.$$('[data-pref]', root).forEach(el => {
      const key = el.dataset.pref;
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, async () => {
        const s = Store.get();
        const value = el.type === 'checkbox' ? el.checked : el.value;
        if (key.startsWith('notification.')) {
          const k = key.split('.')[1];
          const next = { ...s.notifications, [k]: value };
          Store.set({ notifications: next });
          await persistNotifications();
        } else {
          const next = { ...s.prefs, [key]: value };
          Store.set({ prefs: next });
          await persistPrefs();
        }
        applyPrefsFromStore();
      });
    });

    Utils.$$('[data-pref-accent]', root).forEach(b =>
      b.addEventListener('click', async () => {
        const s = Store.get();
        const next = { ...s.prefs, accent: b.dataset.prefAccent };
        Store.set({ prefs: next });
        await persistPrefs();
        applyPrefsFromStore();
        Router.render();
      }));

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

    Utils.$$('[data-action="logout"]', root).forEach(b =>
      b.addEventListener('click', async () => {
        await Auth.logout();
        Store.set({ session: null, route: 'login' });
        Toast.show('Logged out.');
        Router.go('login');
      }));

    Utils.$$('[data-action="change-password"]', root).forEach(b =>
      b.addEventListener('click', openChangePassword));

    Utils.$$('[data-action="submit-master"]', root).forEach(b =>
      b.addEventListener('click', openSubmitMaster));

    Utils.$$('[data-action="report-problem"]', root).forEach(b =>
      b.addEventListener('click', openReportProblem));

    Utils.$$('[data-action="backup-now"]', root).forEach(b =>
      b.addEventListener('click', downloadBackup));

    Utils.$$('[data-action="export"]', root).forEach(b =>
      b.addEventListener('click', exportCSV));

    Utils.$$('[data-restore]', root).forEach(input =>
      input.addEventListener('change', e => {
        const f = e.target.files?.[0];
        if (f) restoreFromFile(f);
        e.target.value = '';
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

window.SettingsPage = SettingsPage;