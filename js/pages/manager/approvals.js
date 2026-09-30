/* ============================================================
   ALISHAN · APPROVALS (Manager App)
   Quality & Colour Master approval queue.
   ============================================================ */

const ApprovalsPage = (() => {

  function render() {
    const s = Store.get();
    const user = s.session || { name: 'Manager', role: 'Manager' };
    const pending = MasterData.pendingList();

    const pendingQuality = pending.filter(p => p.kind === 'Quality');
    const pendingColor = pending.filter(p => p.kind === 'Colour');

    const allQualities = MasterData.getAllQualities();
    const allColors = MasterData.getAllColors();

    return `
      <div class="app-shell">
        ${TopBar(user, s)}
        <main class="page-content" style="max-width:900px;">
          <div class="page-head">
            <div>
              <div class="eyebrow">Manager app · admin</div>
              <h1>Approvals &amp; master data</h1>
              <p class="muted">Approved items appear in user pickers. Deactivated items stay hidden but never broken.</p>
            </div>
            <button class="btn" data-action="back-settings">← Settings</button>
          </div>
          <div class="row" style="gap:8px;margin-bottom:14px;flex-wrap:wrap;">
            <button class="btn primary" data-action="add-quality">＋ Add Quality</button>
            <button class="btn primary" data-action="add-colour">＋ Add Colour</button>
          </div>

          <div class="overview-grid">
            ${StatBox.overview({ label: 'Pending total', value: pending.length, icon: '⏳', key: 'a' })}
            ${StatBox.overview({ label: 'Pending qualities', value: pendingQuality.length, icon: '◈', key: 'a' })}
            ${StatBox.overview({ label: 'Pending colours', value: pendingColor.length, icon: '◉', key: 'a' })}
            ${StatBox.overview({
              label: 'Approved qualities',
              value: Object.values(allQualities).reduce((a, l) => a + l.filter(q => q.status === 'APPROVED').length, 0),
              icon: '✓', key: 'a',
            })}
          </div>

          <section class="setting-section" style="margin-top:18px;">
            <div class="section-title">
              <div>
                <h2>Pending approvals</h2>
                <p class="muted">${pending.length === 0 ? 'All caught up.' : `${pending.length} waiting`}</p>
              </div>
            </div>

            ${pending.length ? pending.map(renderPendingRow).join('') : `<div class="empty">Nothing pending. Good work.</div>`}
          </section>

          <section class="setting-section">
            <div class="section-title">
              <div>
                <h2>Quality master</h2>
                <p class="muted">Manage prices, deactivate never-used items</p>
              </div>
            </div>

            ${['Bra', 'Panty', 'Set', 'Blouse'].map(type => {
              const list = (allQualities[type] || []).filter(q => q.status === 'APPROVED');
              if (!list.length) return '';
              return `
                <h3 style="margin-top:16px;font-size:.9rem;font-weight:800;letter-spacing:.05em;">${type.toUpperCase()}</h3>
                ${list.map(q => renderQualityManageRow(type, q)).join('')}
              `;
            }).join('')}
          </section>

          <section class="setting-section">
            <div class="section-title">
              <div>
                <h2>Colour master</h2>
                <p class="muted">Deactivate colours not in use</p>
              </div>
            </div>

            ${allColors.filter(c => c.status === 'APPROVED').map(c => renderColorManageRow(c)).join('')}
          </section>
        </main>
      </div>
    `;
  }

  function renderPendingRow(p) {
    const isQuality = p.kind === 'Quality';
    return `
      <div class="archive-item">
        <div>
          <strong>${Utils.esc(p.name)}</strong>
          <span class="badge pending" style="margin-left:6px;font-size:.6rem;">${p.kind}</span>
          <div class="archived-meta">
            ${isQuality ? `${Utils.esc(p.type)} · ₹${p.price}/dozen · ` : ''}
            submitted by ${Utils.esc(p.submittedByName || p.submittedBy)} · ${Utils.ago(p.submittedAt)}
          </div>
        </div>
        <div class="row-actions">
          <button class="btn small success" data-action="approve"
                  data-kind="${p.kind}" data-type="${Utils.esc(p.type || '')}"
                  data-name="${Utils.esc(p.name)}">Approve</button>
          <button class="btn small danger" data-action="reject"
                  data-kind="${p.kind}" data-type="${Utils.esc(p.type || '')}"
                  data-name="${Utils.esc(p.name)}">Reject</button>
        </div>
      </div>
    `;
  }

  function renderQualityManageRow(type, q) {
    const inactive = q.active === false;
    return `
      <div class="archive-item">
        <div>
          <strong>${Utils.esc(q.name)}</strong>
          ${inactive ? `<span class="badge neutral" style="margin-left:6px;font-size:.6rem;">inactive</span>` : ''}
          <div class="archived-meta">
            ₹${q.price}/dozen
            ${q.priceUpdatedAt ? ` · updated ${Utils.ago(q.priceUpdatedAt)}` : ''}
          </div>
        </div>
        <div class="row-actions">
          <button class="btn small" data-action="edit-price"
                  data-type="${Utils.esc(type)}" data-name="${Utils.esc(q.name)}">
            Edit price
          </button>
          <button class="btn small ${inactive ? '' : 'danger'}"
                  data-action="toggle-quality"
                  data-type="${Utils.esc(type)}" data-name="${Utils.esc(q.name)}"
                  data-active="${inactive ? 'true' : 'false'}">
            ${inactive ? 'Reactivate' : 'Deactivate'}
          </button>
        </div>
      </div>
    `;
  }

  function renderColorManageRow(c) {
    const inactive = c.active === false;
    return `
      <div class="archive-item">
        <div>
          <strong>${Utils.esc(c.name)}</strong>
          ${inactive ? `<span class="badge neutral" style="margin-left:6px;font-size:.6rem;">inactive</span>` : ''}
          <div class="archived-meta">
            <i style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${Utils.esc(c.hex)};vertical-align:middle;margin-right:4px;"></i>
            ${Utils.esc(c.hex)}
          </div>
        </div>
        <div class="row-actions">
          <button class="btn small ${inactive ? '' : 'danger'}"
                  data-action="toggle-color"
                  data-name="${Utils.esc(c.name)}"
                  data-active="${inactive ? 'true' : 'false'}">
            ${inactive ? 'Reactivate' : 'Deactivate'}
          </button>
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

  function openEditPrice(type, name) {
    const q = MasterData.findQuality(type, name);
    if (!q) return;

    Modal.open({
      title: `Update price · ${name}`,
      text: `Current: ₹${q.price}/dozen. Existing records keep their snapshotted price.`,
      body: `
        <div class="field"><label for="ep-price">New price per dozen (₹)</label>
          <input id="ep-price" type="number" min="0.01" step="0.01" value="${q.price}" /></div>
      `,
      confirmLabel: 'Update price',
      onConfirm: async (modal) => {
        const p = Number(modal.querySelector('#ep-price').value || 0);
        if (!p || p <= 0) { Toast.error('Enter a valid price.'); return false; }
        const s = Store.get();
        const r = await MasterData.updateQualityPrice(type, name, p, s.session.userId, s.session.name);
        if (!r.ok) { Toast.error(r.error); return false; }
        Toast.success('Price updated.');
        Router.render();
        return true;
      },
    });
  }

  /* Manager adds master data directly (auto-approved) */
  function openAddMaster(kind) {
    const isQ = kind === 'Quality';
    Modal.open({
      title: isQ ? 'Add Quality' : 'Add Colour',
      text: 'Manager entries are approved immediately and appear in the Add Quality form.',
      body: `
        ${isQ ? `<div class="field"><label for="am-type">Type</label>
          <select id="am-type"><option>Bra</option><option>Panty</option><option>Set</option><option>Blouse</option></select></div>` : ''}
        <div class="field" style="margin-top:12px"><label for="am-name">Name</label>
          <input id="am-name" placeholder="${isQ ? 'e.g. BEAUTYBOX' : 'e.g. Lavender'}" /></div>
        ${isQ
          ? `<div class="field" style="margin-top:12px"><label for="am-price">Price per dozen (₹)</label>
              <input id="am-price" type="number" min="0.01" step="0.01" placeholder="25" /></div>`
          : `<div class="field" style="margin-top:12px"><label for="am-hex">Colour</label>
              <input id="am-hex" type="color" value="#8c969a" style="height:44px;padding:2px;" /></div>`}
      `,
      confirmLabel: 'Add',
      onConfirm: async (modal) => {
        const s = Store.get();
        const by = { submittedBy: s.session.userId, submittedByName: s.session.name };
        const name = modal.querySelector('#am-name').value.trim();
        if (!name) { Toast.error('Name is required.'); return false; }
        let r;
        if (isQ) {
          const type = modal.querySelector('#am-type').value;
          const price = Number(modal.querySelector('#am-price').value || 0);
          r = await MasterData.submitQuality({ type, name, price, ...by });
          if (r.ok) await MasterData.approveQuality(type, name, by.submittedBy, by.submittedByName);
        } else {
          const hex = modal.querySelector('#am-hex').value;
          r = await MasterData.submitColor({ name, hex, ...by });
          if (r.ok) await MasterData.approveColor(name, by.submittedBy, by.submittedByName);
        }
        if (!r.ok) { Toast.error(r.error); return false; }
        Toast.success(`${kind} added.`);
        Router.render();
        return true;
      },
    });
  }

  function mount(root) {
    Utils.$$('[data-action="add-quality"]', root).forEach(b => b.addEventListener('click', () => openAddMaster('Quality')));
    Utils.$$('[data-action="add-colour"]', root).forEach(b => b.addEventListener('click', () => openAddMaster('Colour')));

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

    Utils.$$('[data-action="approve"]', root).forEach(b => b.addEventListener('click', async () => {
      const { kind, type, name } = b.dataset;
      const s = Store.get();
      const r = kind === 'Quality'
        ? await MasterData.approveQuality(type, name, s.session.userId, s.session.name)
        : await MasterData.approveColor(name, s.session.userId, s.session.name);
      if (!r.ok) return Toast.error(r.error);
      Toast.success(`${kind} "${name}" approved.`);
      Router.render();
    }));

    Utils.$$('[data-action="reject"]', root).forEach(b => b.addEventListener('click', async () => {
      const { kind, type, name } = b.dataset;
      const ok = await Modal.confirm({
        title: `Reject "${name}"?`,
        text: 'The submitter will not see it in their pickers.',
        confirmLabel: 'Reject',
        danger: true,
      });
      if (!ok) return;
      const s = Store.get();
      const r = kind === 'Quality'
        ? await MasterData.rejectQuality(type, name, s.session.userId, s.session.name)
        : await MasterData.rejectColor(name, s.session.userId, s.session.name);
      if (!r.ok) return Toast.error(r.error);
      Toast.success(`${kind} "${name}" rejected.`);
      Router.render();
    }));

    Utils.$$('[data-action="edit-price"]', root).forEach(b =>
      b.addEventListener('click', () => openEditPrice(b.dataset.type, b.dataset.name)));

    Utils.$$('[data-action="toggle-quality"]', root).forEach(b => b.addEventListener('click', async () => {
      const { type, name, active } = b.dataset;
      const currentlyInactive = active === 'true';
      const nextActive = currentlyInactive;
      const s = Store.get();
      const r = await MasterData.setQualityActive(type, name, nextActive, s.session.userId, s.session.name);
      if (!r.ok) return Toast.error(r.error);
      Toast.success(`Quality ${nextActive ? 'reactivated' : 'deactivated'}.`);
      Router.render();
    }));

    Utils.$$('[data-action="toggle-color"]', root).forEach(b => b.addEventListener('click', async () => {
      const { name, active } = b.dataset;
      const currentlyInactive = active === 'true';
      const nextActive = currentlyInactive;
      const s = Store.get();
      const r = await MasterData.setColorActive(name, nextActive, s.session.userId, s.session.name);
      if (!r.ok) return Toast.error(r.error);
      Toast.success(`Colour ${nextActive ? 'reactivated' : 'deactivated'}.`);
      Router.render();
    }));
  }

  return { render, mount };
})();

window.ApprovalsPage = ApprovalsPage;