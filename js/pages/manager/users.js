/* ============================================================
   ALISHAN · USER MANAGEMENT (Manager App)
   Add user, Bulk Import CSV, Reset password, Activate/Deactivate.
   ============================================================ */

const UsersPage = (() => {

  function render() {
    const s = Store.get();
    const manager = s.session || { name: 'Manager', role: 'Manager' };
    const users = s._users || [];

    const active = users.filter(u => u.status !== 'inactive').length;
    const managers = users.filter(u => u.role === 'Manager').length;

    return `
      <div class="app-shell">
        ${TopBar(manager, s)}
        <main class="page-content" style="max-width:900px;">
          <div class="page-head">
            <div>
              <div class="eyebrow">Manager app · admin</div>
              <h1>User management</h1>
              <p class="muted">No delete — only activate / deactivate.</p>
            </div>
            <div class="row" style="gap:6px;flex-wrap:wrap;">
              <button class="btn" data-action="back-settings">← Settings</button>
              <label class="btn" style="display:inline-block;">
                ⬆ Bulk Import
                <input type="file" accept=".csv" data-bulk-import style="display:none" />
              </label>
              <button class="btn primary" data-action="add-user">＋ Add user</button>
            </div>
          </div>

          <div class="overview-grid">
            ${StatBox.overview({ label: 'Total accounts', value: users.length, icon: '👥', key: 'a' })}
            ${StatBox.overview({ label: 'Active', value: active, icon: '✓', key: 'a' })}
            ${StatBox.overview({ label: 'Managers', value: managers, icon: '🛡', key: 'a' })}
            ${StatBox.overview({ label: 'Users', value: users.length - managers, icon: '👤', key: 'a' })}
          </div>

          <section class="setting-section" style="margin-top:18px;">
            <div class="section-title">
              <div>
                <h2>All accounts</h2>
                <p class="muted">${users.length} account${users.length === 1 ? '' : 's'} on this device</p>
              </div>
            </div>

            ${users.length ? users.map(u => renderUserRow(u, s)).join('') : `<div class="empty">No users yet.</div>`}
          </section>

          <section class="setting-section" style="margin-top:14px;">
            <div class="section-title">
              <div>
                <h2>Bulk import CSV format</h2>
                <p class="muted">Upload a .csv file with these columns</p>
              </div>
            </div>
            <pre style="background:var(--surface-2);padding:12px;border-radius:var(--radius-sm);font-size:.78rem;overflow:auto;">name,phone,role,password
Rahul Kumar,7777777777,User,rahul123
Priya Sharma,6666666666,User,priya123
Aslam Khan,5555555555,Manager,aslam456</pre>
            <p class="muted" style="font-size:.78rem;margin-top:8px;">
              Role: <code>User</code> or <code>Manager</code>. Password: min 6 characters.
              Duplicates and invalid rows are skipped automatically.
            </p>
          </section>
        </main>
      </div>
    `;
  }

  function renderUserRow(u, s) {
    const isActive = u.status !== 'inactive';
    const isSelf = u.id === s.session?.userId;

    return `
      <div class="archive-item">
        <div>
          <strong>${Utils.esc(u.name)}</strong>
          <span class="badge ${u.role === 'Manager' ? 'accent' : 'neutral'}"
                style="margin-left:6px;font-size:.6rem;">
            ${Utils.esc(u.role)}
          </span>
          ${!isActive ? `<span class="badge unpaid" style="margin-left:4px;font-size:.6rem;">inactive</span>` : ''}
          ${isSelf ? `<span class="badge completed" style="margin-left:4px;font-size:.6rem;">you</span>` : ''}
          <div class="archived-meta">
            📞 ${Utils.esc(u.phone)} · created ${Utils.ago(u.createdAt)}
          </div>
        </div>
        <div class="row-actions">
          <button class="btn small" data-action="reset-password" data-id="${Utils.esc(u.id)}">
            Reset password
          </button>
          ${!isSelf ? `
            <button class="btn small ${isActive ? 'danger' : ''}" data-action="toggle-active" data-id="${Utils.esc(u.id)}">
              ${isActive ? 'Deactivate' : 'Activate'}
            </button>
          ` : ''}
        </div>
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

  function openAddUser() {
    Modal.open({
      title: 'Add new user',
      text: 'Set password directly — no SMS / email verification.',
      body: `
        <div class="field"><label for="au-name">Name</label>
          <input id="au-name" placeholder="Full name" /></div>
        <div class="field" style="margin-top:12px"><label for="au-phone">Phone number</label>
          <input id="au-phone" type="tel" inputmode="numeric" maxlength="10"
                 pattern="[0-9]*" placeholder="10-digit phone" /></div>
        <div class="field" style="margin-top:12px"><label>Role</label>
          <div class="segmented" role="group" aria-label="Role">
            <button type="button" class="active" data-role="User" id="au-role-user">User</button>
            <button type="button" data-role="Manager" id="au-role-manager">Manager</button>
          </div>
          <input type="hidden" id="au-role" value="User" />
        </div>
        <div class="field" style="margin-top:12px"><label for="au-password">Initial password</label>
          <input id="au-password" type="text" minlength="6" placeholder="Min 6 characters" />
          <div class="hint">Tell the new person this password verbally.</div>
        </div>
      `,
      confirmLabel: 'Create account',
      onConfirm: async (modal) => {
        const name = modal.querySelector('#au-name').value.trim();
        const phone = modal.querySelector('#au-phone').value.trim();
        const role = modal.querySelector('#au-role').value;
        const password = modal.querySelector('#au-password').value;

        const s = Store.get();
        const r = await Auth.createUser({
          name, phone, role, password,
          createdBy: s.session.userId,
        });
        if (!r.ok) { Toast.error(r.error); return false; }

        await loadUsers();
        Toast.success(`${role} "${name}" created.`);
        Router.render();
        return true;
      },
    });

    setTimeout(() => {
      const userBtn = Utils.$('#au-role-user');
      const mgrBtn = Utils.$('#au-role-manager');
      const hidden = Utils.$('#au-role');
      const phoneInput = Utils.$('#au-phone');

      if (phoneInput) {
        phoneInput.addEventListener('input', () => {
          phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
        });
      }
      userBtn?.addEventListener('click', () => {
        userBtn.classList.add('active');
        mgrBtn.classList.remove('active');
        hidden.value = 'User';
      });
      mgrBtn?.addEventListener('click', () => {
        mgrBtn.classList.add('active');
        userBtn.classList.remove('active');
        hidden.value = 'Manager';
      });
    }, 80);
  }

  function openResetPassword(userId) {
    const s = Store.get();
    const user = (s._users || []).find(u => u.id === userId);
    if (!user) return;

    Modal.open({
      title: `Reset password · ${user.name}`,
      text: 'Set a new password. Tell it to the user verbally.',
      body: `
        <div class="field"><label for="rp-new">New password</label>
          <input id="rp-new" type="text" minlength="6" placeholder="Min 6 characters" /></div>
      `,
      confirmLabel: 'Reset password',
      onConfirm: async (modal) => {
        const next = modal.querySelector('#rp-new').value;
        const s2 = Store.get();
        const r = await Auth.resetPassword(s2.session.userId, s2.session.name, userId, next);
        if (!r.ok) { Toast.error(r.error); return false; }
        Toast.success(`Password reset for ${user.name}.`);
        return true;
      },
    });
  }

  async function toggleActive(userId) {
    const s = Store.get();
    const user = (s._users || []).find(u => u.id === userId);
    if (!user) return;
    const isActive = user.status !== 'inactive';
    const nextStatus = isActive ? 'inactive' : 'active';

    if (isActive) {
      const ok = await Modal.confirm({
        title: `Deactivate ${user.name}?`,
        text: 'They will not be able to log in. Their records stay intact.',
        confirmLabel: 'Deactivate',
        danger: true,
      });
      if (!ok) return;
    }

    const r = await Auth.setUserStatus(s.session.userId, s.session.name, userId, nextStatus);
    if (!r.ok) { Toast.error(r.error); return; }
    await loadUsers();
    Toast.success(`User ${nextStatus === 'active' ? 'activated' : 'deactivated'}.`);
    Router.render();
  }

  async function handleBulkImport(file) {
    try {
      const text = await file.text();
      const parsed = CSVImport.parse(text);
      const rows = parsed.rows;

      if (!rows.length) {
        Toast.error('CSV has no data rows.');
        return;
      }

      const s = Store.get();
      let created = 0, skippedDup = 0, skippedInvalid = 0;
      const errors = [];

      for (const row of rows) {
        const name = String(row.name || '').trim();
        const phone = String(row.phone || '').replace(/\D/g, '').trim();
        const role = String(row.role || 'User').trim();
        const password = String(row.password || '').trim();

        if (!name || !/^\d{10}$/.test(phone) || !['User','Manager'].includes(role) || password.length < 6) {
          skippedInvalid++;
          errors.push(`${name || phone || 'row'}: invalid data`);
          continue;
        }

        const r = await Auth.createUser({
          name, phone, role, password,
          createdBy: s.session.userId,
        });
        if (!r.ok) {
          if (r.error?.toLowerCase().includes('already')) skippedDup++;
          else skippedInvalid++;
          errors.push(`${name}: ${r.error}`);
        } else {
          created++;
        }
      }

      await loadUsers();

      const lines = [
        `<strong>${created} created</strong>`,
        skippedDup ? `${skippedDup} skipped (duplicate phone)` : '',
        skippedInvalid ? `${skippedInvalid} skipped (invalid data)` : '',
      ].filter(Boolean).join(' · ');

      Modal.open({
        title: 'Import complete',
        text: lines,
        body: errors.length
          ? `<div style="max-height:200px;overflow:auto;background:var(--surface-2);padding:10px;border-radius:var(--radius-sm);font-size:.76rem;line-height:1.6;">${errors.map(e => Utils.esc(e)).join('<br />')}</div>`
          : '',
        confirmLabel: 'Done',
        cancelLabel: '',
        onConfirm: () => true,
      });
      Router.render();
    } catch (e) {
      console.error(e);
      Toast.error('Failed to parse CSV file.');
    }
  }

  async function loadUsers() {
    const users = await DB.getAll('users');
    users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    Store.set({ _users: users });
  }

  async function mount(root) {
    await loadUsers();
    const appRoot = document.getElementById('app-root');
    appRoot.innerHTML = render();
    wireEvents();
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

    Utils.$$('[data-action="add-user"]', root).forEach(b =>
      b.addEventListener('click', openAddUser));

    Utils.$$('[data-action="reset-password"]', root).forEach(b =>
      b.addEventListener('click', () => openResetPassword(b.dataset.id)));

    Utils.$$('[data-action="toggle-active"]', root).forEach(b =>
      b.addEventListener('click', () => toggleActive(b.dataset.id)));

    Utils.$$('[data-bulk-import]', root).forEach(input =>
      input.addEventListener('change', e => {
        const f = e.target.files?.[0];
        if (f) handleBulkImport(f);
        e.target.value = '';
      }));
  }

  return { render, mount };
})();

window.UsersPage = UsersPage;