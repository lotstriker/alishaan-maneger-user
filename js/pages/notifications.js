/* ============================================================
   ALISHAN · NOTIFICATIONS PAGE
   Full notification preferences (per-user, role-aware).
   Manager App shows 2 extra toggles.
   ============================================================ */

const NotificationsPage = (() => {

  const USER_TOGGLES = [
    ['pending', 'Pending payment reminders', 'Jab payment kai din se pending ho'],
    ['aging',   'Aging stock alerts',        'Koi quality 10+ din se incomplete ho'],
    ['report',  'Weekly / monthly report summary', 'Auto digest per your display preference'],
    ['backup',  'Backup reminders',          'Reminders for backup schedules'],
    ['push',    'Push channel',              'In-app notifications'],
    ['email',   'Email channel',             'Delivery to your notification email'],
  ];

  const MANAGER_EXTRA_TOGGLES = [
    ['approval', 'New approval request', 'A Quality/Colour submission is waiting for a decision'],
    ['newUser',  'New user added',        'Confirmation when an account is created'],
  ];

  function render() {
    const s = Store.get();
    const user = s.session || { name: 'User', role: 'User' };
    const n = s.notifications || {};

    return `
      <div class="app-shell">
        ${TopBar(user, s)}
        <main class="page-content" style="max-width:780px;">
          <div class="page-head">
            <div>
              <div class="eyebrow">Settings · notifications</div>
              <h1>Notifications</h1>
              <p class="muted">Push and email only. Quiet hours apply to every event.</p>
            </div>
            <button class="btn" data-action="back-settings">← Settings</button>
          </div>

          <section class="setting-section">
            <div class="section-title"><h2>Events</h2></div>

            ${USER_TOGGLES.map(([k, label, desc]) => `
              <div class="setting-row">
                <div>
                  <strong>${Utils.esc(label)}</strong>
                  <small>${Utils.esc(desc)}</small>
                </div>
                ${toggle('notification.' + k, n[k])}
              </div>
            `).join('')}

            ${user.role === 'Manager' ? MANAGER_EXTRA_TOGGLES.map(([k, label, desc]) => `
              <div class="setting-row">
                <div>
                  <strong>${Utils.esc(label)}</strong>
                  <small>${Utils.esc(desc)}</small>
                </div>
                ${toggle('notification.' + k, n[k])}
              </div>
            `).join('') : ''}
          </section>

          <section class="setting-section">
            <div class="section-title"><h2>Delivery</h2></div>

            <div class="setting-row">
              <div>
                <strong>Notification email</strong>
                <small>Where email notifications are sent</small>
              </div>
              <input type="email" data-pref="notification.emailAddress"
                     value="${Utils.esc(n.emailAddress || '')}"
                     placeholder="your@email.com"
                     aria-label="Notification email" />
            </div>

            <div class="setting-row">
              <div>
                <strong>Quiet hours</strong>
                <small>No notifications sent during this window</small>
              </div>
              <div class="row" style="gap:6px;">
                <input type="time" data-pref="notification.quietFrom" value="${Utils.esc(n.quietFrom || '22:00')}"
                       aria-label="Quiet hours start" />
                <input type="time" data-pref="notification.quietTo"   value="${Utils.esc(n.quietTo   || '06:00')}"
                       aria-label="Quiet hours end" />
              </div>
            </div>

            <div class="form-actions" style="margin-top:14px;">
              <button class="btn primary" data-action="save-notifications">Save settings</button>
            </div>
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

  function toggle(key, on) {
    return `<button class="switch ${on ? 'on' : ''}" type="button"
                    data-toggle="${Utils.esc(key)}" aria-pressed="${!!on}">
              <span></span>
            </button>`;
  }

  async function persist() {
    const s = Store.get();
    await DB.setNotifications(s.session.userId, s.notifications);
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
      b.addEventListener('click', () => {
        Store.set({ ui: { settingsTab: 'notifications' }});
        Router.go('settings');
      }));

    Utils.$$('[data-toggle]', root).forEach(b =>
      b.addEventListener('click', async () => {
        const key = b.dataset.toggle;
        const s = Store.get();
        if (key.startsWith('notification.')) {
          const k = key.split('.')[1];
          const next = { ...s.notifications, [k]: !s.notifications[k] };
          Store.set({ notifications: next });
          await persist();
          Router.render();
        }
      }));

    Utils.$$('[data-pref]', root).forEach(el => {
      const key = el.dataset.pref;
      el.addEventListener('input', () => {
        const s = Store.get();
        const k = key.split('.')[1];
        Store.set({ notifications: { ...s.notifications, [k]: el.value }});
      });
    });

    Utils.$$('[data-action="save-notifications"]', root).forEach(b =>
      b.addEventListener('click', async () => {
        await persist();
        Toast.success('Notification settings saved.');
      }));
  }

  return { render, mount };
})();

window.NotificationsPage = NotificationsPage;