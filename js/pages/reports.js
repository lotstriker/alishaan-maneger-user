/* ============================================================
   ALISHAN · REPORTS PAGE
   5 tabs: Pending · Period · History · Valuation · Aging
   + Compare Periods chart + payment edit/archive
   ============================================================ */

const ReportsPage = (() => {

  function recordsForCurrentUser() {
    const s = Store.get();
    const uid = s.session?.userId;
    if (!uid) return [];
    if (s.session.role === 'Manager') {
      return (s._records || []).filter(r => !r.archived);
    }
    return (s._records || []).filter(r => r.ownerId === uid && !r.archived);
  }

  function reportFiltered(records) {
    const s = Store.get();
    const f = s.ui.reportFilters || { period: 'all', type: 'all' };

    let rs = records.slice();
    if (f.type && f.type !== 'all') {
      rs = rs.filter(r => r.type === f.type);
    }
    if (f.period && f.period !== 'all') {
      const days = Number(f.period);
      if (!isNaN(days)) {
        rs = rs.filter(r => Utils.daysBetween(r.entryDate) <= days);
      }
    }
    return rs;
  }

  function overview(records) {
    const s = Store.get();
    const payments = s._payments || [];

    const totalValue = records.reduce((a, r) => a + Calc.compute(r).amount, 0);
    const totalItems = records.length;
    const aging = records.filter(r => Calc.isAging(r)).length;

    const totalReceived = payments
      .filter(p => !p.archived && records.some(r => r.id === p.recordId))
      .reduce((a, p) => a + Number(p.amount || 0), 0);

    const pending = records.reduce((a, r) => a + Calc.pendingAmount(r, payments), 0);

    const periodDays = s.prefs.period === 'monthly' ? 30 : 7;
    const periods = Math.max(1, Math.ceil((Number(s.ui.reportFilters?.period) || 9999) / periodDays));
    const avg = totalReceived / periods;

    return { totalValue, totalItems, aging, avg, totalReceived, pending, periodDays };
  }

  function tabBar(s) {
    const monthly = s.prefs.period === 'monthly';
    const tabs = [
      ['pending', 'Pending amount'],
      ['period',  monthly ? 'Monthly reports' : 'Weekly reports'],
      ['history', 'Amount history'],
      ['value',   'Inventory valuation'],
      ['aging',   'Stock aging'],
    ];
    return `
      <div class="tabs">
        ${tabs.map(([k, l]) => `
          <button class="${s.ui.reportTab === k ? 'active' : ''}"
                  data-report-tab="${k}">${l}</button>
        `).join('')}
      </div>
    `;
  }

  function render() {
    const s = Store.get();
    const user = s.session || { name: 'User', role: 'User' };

    const all = recordsForCurrentUser();
    const filtered = reportFiltered(all);
    const o = overview(filtered);

    return `
      <div class="app-shell">
        ${TopBar(user, s)}
        <main class="page-content">
          <div class="page-head">
            <div>
              <div class="eyebrow">${user.role === 'Manager' ? 'Manager app · insight' : 'User app · insight'}</div>
              <h1>Reports &amp; analytics</h1>
              <p class="muted">Live calculations from ${user.role === 'Manager' ? 'all users' : 'your own records'}.</p>
            </div>
            <button class="btn" data-action="export">↧ Export CSV</button>
          </div>

          <div class="card report-filters" style="margin-top:0;">
            <div class="field">
              <label for="report-period">Time period</label>
              <select id="report-period">
                <option value="all" ${s.ui.reportFilters.period === 'all' ? 'selected' : ''}>All time</option>
                <option value="7"   ${s.ui.reportFilters.period === '7'   ? 'selected' : ''}>Last 7 days</option>
                <option value="30"  ${s.ui.reportFilters.period === '30'  ? 'selected' : ''}>Last 30 days</option>
                <option value="90"  ${s.ui.reportFilters.period === '90'  ? 'selected' : ''}>Last 90 days</option>
              </select>
            </div>
            <div class="field">
              <label for="report-type">Product type</label>
              <select id="report-type">
                <option value="all" ${s.ui.reportFilters.type === 'all' ? 'selected' : ''}>All types</option>
                ${['Bra','Panty','Set','Blouse'].map(t => `
                  <option ${s.ui.reportFilters.type === t ? 'selected' : ''}>${t}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-actions">
              <button class="btn primary" data-action="report-apply">Apply</button>
              <button class="btn" data-action="report-reset">Reset</button>
            </div>
          </div>

          <div class="overview-grid" style="margin-top:18px;">
            ${StatBox.overview({ label: 'Total value', value: Utils.money(o.totalValue), icon: '₹', key: 'all' })}
            ${StatBox.overview({ label: 'Total items', value: o.totalItems, icon: '▦', key: 'all' })}
            ${StatBox.overview({ label: 'Aging (10d+)', value: o.aging, icon: '⌛', key: 'aging' })}
            ${StatBox.overview({
              label: (o.periodDays === 30 ? 'Monthly' : 'Weekly') + ' avg',
              value: Utils.money(o.avg), icon: '↗', key: 'all',
            })}
            ${StatBox.overview({ label: 'Received', value: Utils.money(o.totalReceived), icon: '✓', key: 'all' })}
            ${StatBox.overview({ label: 'Pending', value: Utils.money(o.pending), icon: '₹', key: 'pending' })}
          </div>

          ${tabBar(s)}

          ${renderTab(filtered, s)}
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
            <span class="name">${Utils.esc(user.name)}${user.role === 'Manager' ? ' <span class="badge accent" style="font-size:.6rem;margin-left:4px;">MGR</span>' : ''}</span>
          </div>
        </div>
      </header>
    `;
  }

  function renderTab(records, s) {
    switch (s.ui.reportTab) {
      case 'pending': return renderPendingTab(records, s);
      case 'period':  return renderPeriodTab(records, s);
      case 'history': return renderHistoryTab(records, s);
      case 'value':   return renderValueTab(records, s);
      case 'aging':   return renderAgingTab(records, s);
      default:        return renderPendingTab(records, s);
    }
  }

  /* ---------- Tab 1: Pending ---------- */
  function renderPendingTab(records, s) {
    const payments = s._payments || [];
    const items = records
      .filter(r => r.paymentTracked && Calc.pendingAmount(r, payments) > 0)
      .sort((a, b) => Calc.pendingAmount(b, payments) - Calc.pendingAmount(a, payments));

    const totalPending = items.reduce((a, r) => a + Calc.pendingAmount(r, payments), 0);

    if (!items.length) {
      return `<div class="card empty">No pending payments. All clear.</div>`;
    }

    const rows = items.map(r => {
      const c = Calc.compute(r);
      const rec = Calc.totalReceived(r, payments);
      const pend = Math.max(0, c.amount - rec);
      const pct = c.amount > 0 ? (rec / c.amount) * 100 : 0;
      return `
        <div class="report-row" style="display:block;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div>
              <strong>${Utils.esc(r.quality)} · ${Utils.esc(r.id)}</strong>
              <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">
                ${Utils.esc(r.type)} · Cup ${Utils.esc(r.cup)}
              </div>
            </div>
            <div class="row-actions">
              <button class="btn small primary" data-action="pay" data-id="${Utils.esc(r.id)}">
                ＋ Add payment
              </button>
            </div>
          </div>
          <div class="stat-box" style="margin-top:10px;">
            <div class="cell"><div class="value">${Utils.money(c.amount)}</div><div class="label">Expected</div></div>
            <div class="cell"><div class="value success">${Utils.money(rec)}</div><div class="label">Received</div></div>
            <div class="cell"><div class="value warning">${Utils.money(pend)}</div><div class="label">Pending</div></div>
          </div>
          <div class="progress" style="margin-top:10px;">
            <span style="width:${pct}%"></span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card panel" style="padding:18px;">
        <div class="section-title">
          <div>
            <h2>Pending amount receival</h2>
            <p class="muted">${items.length} record${items.length === 1 ? '' : 's'} · Total ${Utils.money(totalPending)} pending</p>
          </div>
        </div>
        <div class="report-list">${rows}</div>
      </div>
    `;
  }

  /* ---------- Tab 2: Period ---------- */
  function renderPeriodTab(records, s) {
    const monthly = s.prefs.period === 'monthly';
    const periodDays = monthly ? 30 : 7;
    const payments = s._payments || [];

    const periods = [];
    for (let i = 5; i >= 0; i--) {
      const end = new Date(Date.now() - i * periodDays * 86400000);
      const start = new Date(end.getTime() - (periodDays - 1) * 86400000);
      const list = records.filter(r => {
        const d = new Date(r.entryDate);
        return d >= start && d <= end;
      });
      const earned = list.reduce((a, r) => a + Calc.compute(r).amount, 0);
      const received = list.reduce((a, r) => a + Calc.totalReceived(r, payments), 0);
      const pending = list.reduce((a, r) => a + Calc.pendingAmount(r, payments), 0);
      const dozen = list.reduce((a, r) => a + Calc.compute(r).totalDozen, 0);
      const label = i === 0
        ? (monthly ? 'This month' : 'This week')
        : (monthly ? `${i} mo ago` : `${i} wk ago`);
      periods.push({
        label,
        range: Utils.formatRange(start, end),
        added: list.length,
        dozen, earned, received, pending,
      });
    }

    const chartData = periods.map(p => ({ label: p.label, value: p.earned }));

    const rows = periods.slice().reverse().map(p => `
      <div class="report-period-card">
        <div class="report-period-head">
          <strong>${Utils.esc(p.label)}</strong>
          <span class="range">${Utils.esc(p.range)}</span>
        </div>
        <div class="stat-box">
          <div class="cell"><div class="value">${p.added}</div><div class="label">Added</div></div>
          <div class="cell"><div class="value">${Utils.dozen(p.dozen)}</div><div class="label">Dozen</div></div>
          <div class="cell"><div class="value accent">${Utils.money(p.earned)}</div><div class="label">Earned</div></div>
          <div class="cell"><div class="value success">${Utils.money(p.received)}</div><div class="label">Received</div></div>
          <div class="cell"><div class="value warning">${Utils.money(p.pending)}</div><div class="label">Pending</div></div>
        </div>
      </div>
    `).join('');

    return `
      <div class="card panel" style="padding:18px;">
        <div class="section-title">
          <div>
            <h2>Last 6 ${monthly ? 'months' : 'weeks'}</h2>
            <p class="muted">Value of records by entry date.</p>
          </div>
        </div>
        ${Charts.barChart({ data: chartData, height: 200, valueFormat: v => Utils.money(v) })}
        ${renderComparePeriods(records, s)}
        <div class="report-list">${rows}</div>
      </div>
    `;
  }

  function renderComparePeriods(records, s) {
    const monthly = s.prefs.period === 'monthly';
    const periodDays = monthly ? 30 : 7;

    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const end = new Date(Date.now() - i * periodDays * 86400000);
      const start = new Date(end.getTime() - (periodDays - 1) * 86400000);
      const list = records.filter(r => {
        const d = new Date(r.entryDate);
        return d >= start && d <= end;
      });
      buckets.push(list.reduce((a, r) => a + Calc.compute(r).amount, 0));
    }

    const current = buckets.slice(3);
    const previous = buckets.slice(0, 3);
    const labels = ['1', '2', '3'];
    const compareType = s.ui.compareChartType || 'line';

    return `
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--line);">
        <div class="compare-head">
          <div>
            <strong>Compare periods</strong>
            <p class="muted" style="font-size:.75rem;margin-top:2px;">
              Current 3 ${monthly ? 'months' : 'weeks'} vs previous
            </p>
          </div>
          <div class="chart-type-switch">
            ${['line','bar','area'].map(t => `
              <button class="${compareType === t ? 'active' : ''}"
                      data-compare-type="${t}">${t[0].toUpperCase() + t.slice(1)}</button>
            `).join('')}
          </div>
        </div>
        ${Charts.comparePeriodsChart({ current, previous, labels, type: compareType, height: 220 })}
      </div>
    `;
  }

  /* ---------- Tab 3: Amount History ---------- */
  function renderHistoryTab(records, s) {
    const payments = s._payments || [];
    const ids = new Set(records.map(r => r.id));
    const rows = payments
      .filter(p => ids.has(p.recordId) && !p.archived)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (!rows.length) {
      return `<div class="card empty">No payments recorded yet.</div>`;
    }

    const rowsHtml = rows.map(p => {
      const rec = records.find(r => r.id === p.recordId);
      return `
        <div class="report-row">
          <div>
            <strong>${rec ? Utils.esc(rec.quality) : 'Archived'}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">
              ${Utils.esc(p.date)} · ${Utils.esc(p.method)}${p.note ? ' · ' + Utils.esc(p.note) : ''}
            </div>
          </div>
          <div class="row" style="gap:6px;align-items:center;">
            <strong class="text-success" style="font-size:1rem;">+${Utils.money(p.amount)}</strong>
            ${Store.get().session?.role === 'Manager' ? '' : `<button class="btn small" data-action="edit-payment" data-id="${Utils.esc(p.id)}">Edit</button>
            <button class="btn small danger" data-action="archive-payment" data-id="${Utils.esc(p.id)}">Archive</button>`}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="card panel" style="padding:18px;">
        <div class="section-title">
          <div>
            <h2>Amount history</h2>
            <p class="muted">${rows.length} transaction${rows.length === 1 ? '' : 's'} · newest first</p>
          </div>
        </div>
        <div class="report-list">${rowsHtml}</div>
      </div>
    `;
  }

  /* ---------- Tab 4: Valuation ---------- */
  function renderValueTab(records) {
    const types = ['Bra', 'Panty', 'Set', 'Blouse'];
    const palette = ['#61A9BD', '#44986D', '#E98E2E', '#9267C6'];

    const grouped = types.map((t, i) => ({
      type: t,
      value: records.filter(r => r.type === t).reduce((a, r) => a + Calc.compute(r).amount, 0),
      color: palette[i],
    })).filter(g => g.value > 0);

    const topQualities = (() => {
      const map = {};
      for (const r of records) {
        const key = r.quality;
        if (!map[key]) map[key] = 0;
        map[key] += Calc.compute(r).amount;
      }
      return Object.entries(map)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    })();

    const totalValue = grouped.reduce((a, g) => a + g.value, 0);

    return `
      <div class="card panel" style="padding:18px;">
        <div class="section-title">
          <div>
            <h2>Inventory valuation</h2>
            <p class="muted">Value split by quality type · ${Utils.money(totalValue)} total</p>
          </div>
        </div>

        ${grouped.length ? `
          ${Charts.doughnutChart({
            data: grouped.map(g => ({ label: g.type, value: g.value, color: g.color })),
            size: 200, thickness: 26,
            centerLabel: 'total value',
            centerValue: Utils.money(totalValue),
          })}
        ` : `<div class="empty">No records to value.</div>`}

        <h3 style="margin-top:24px;font-size:1rem;">Top 5 qualities by value</h3>
        ${topQualities.length ? Charts.horizontalBarChart({
          data: topQualities,
          valueFormat: v => Utils.money(v),
        }) : `<div class="empty">No qualities yet.</div>`}
      </div>
    `;
  }

  /* ---------- Tab 5: Aging ---------- */
  function renderAgingTab(records) {
    const aging = records
      .filter(r => Calc.isAging(r))
      .sort((a, b) => Calc.agingDays(b) - Calc.agingDays(a));

    const buckets = [
      { label: '10–15d', min: 10, max: 15, color: '#CED14E' },
      { label: '16–20d', min: 16, max: 20, color: '#E98E2E' },
      { label: '21–30d', min: 21, max: 30, color: '#D8524F' },
      { label: '30d+',   min: 31, max: 9999, color: '#973130' },
    ];

    const bucketData = buckets.map(b => ({
      label: b.label,
      value: aging.filter(r => {
        const d = Calc.agingDays(r);
        return d >= b.min && d <= b.max;
      }).length,
      color: b.color,
    }));

    const rows = aging.map(r => {
      const d = Calc.agingDays(r);
      const sev = d >= 31 ? 4 : d >= 21 ? 3 : d >= 16 ? 2 : 1;
      return `
        <div class="report-row aging-row sev-${sev}">
          <div>
            <strong>${Utils.esc(r.quality)}</strong>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">
              ${Utils.esc(r.id)} · ${Utils.esc(r.lot || 'no lot')} · ${Utils.esc(r.type)}
            </div>
          </div>
          <strong style="color:var(--danger);font-size:.95rem;">${d} days</strong>
        </div>
      `;
    }).join('');

    return `
      <div class="card panel" style="padding:18px;">
        <div class="section-title">
          <div>
            <h2>Stock aging analysis</h2>
            <p class="muted">${aging.length} record${aging.length === 1 ? '' : 's'} still incomplete after 10+ days</p>
          </div>
        </div>
        ${aging.length ? Charts.barChart({
          data: bucketData, height: 200, valueFormat: v => v,
        }) : `<div class="empty">No aging stock. Good news.</div>`}
        ${aging.length ? `<div class="report-list">${rows}</div>` : ''}
      </div>
    `;
  }

  /* ---------- CSV export ---------- */
  function exportCSV() {
    const records = reportFiltered(recordsForCurrentUser());
    const payments = Store.get()._payments || [];
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
    a.download = 'alishan-reports.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Toast.success('CSV export downloaded.');
  }

  /* ---------- Payment modal ---------- */
  function openPaymentModal(recordId) {
    if (Store.get().session?.role === 'Manager') { Toast.error('Manager view-only hai.'); return; }
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
        <div class="field"><label for="pay-amount">Amount (₹)</label>
          <input id="pay-amount" type="number" min="0.01" max="${pending}" step="0.01" value="${pending}" /></div>
        <div class="field" style="margin-top:12px"><label for="pay-method">Method</label>
          <select id="pay-method">
            <option>Cash</option><option>UPI</option>
            <option>Bank Transfer</option><option>Other</option>
          </select>
        </div>
        <div class="field" style="margin-top:12px"><label for="pay-note">Note (optional)</label>
          <input id="pay-note" /></div>
      `,
      confirmLabel: 'Save payment',
      onConfirm: async (modal) => {
        const amount = Number(modal.querySelector('#pay-amount').value || 0);
        if (!amount || amount <= 0) { Toast.error('Enter a valid amount.'); return false; }
        if (amount > pending + 0.005) { Toast.error('Pending amount se zyada nahi de sakte.'); return false; }
        const payment = {
          id: Utils.uid('P'), recordId: rec.id, amount,
          date: Utils.todayISO(),
          method: modal.querySelector('#pay-method').value,
          note: modal.querySelector('#pay-note').value || '',
          createdBy: s.session.userId, createdAt: Utils.nowISO(), archived: false,
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

  function openEditPayment(paymentId) {
    if (Store.get().session?.role === 'Manager') { Toast.error('Manager view-only hai.'); return; }
    const s = Store.get();
    const p = (s._payments || []).find(x => x.id === paymentId);
    if (!p) return;
    const rec = (s._records || []).find(r => r.id === p.recordId);
    if (!rec) return;

    const c = Calc.compute(rec);
    const otherReceived = (s._payments || [])
      .filter(x => x.recordId === p.recordId && x.id !== p.id && !x.archived)
      .reduce((a, x) => a + Number(x.amount || 0), 0);
    const maxAllowed = Math.max(0, c.amount - otherReceived);

    Modal.open({
      title: `Edit payment · ${p.date}`,
      text: `Max allowed: ${Utils.money(maxAllowed)}`,
      body: `
        <div class="field"><label for="ep-amount">Amount (₹)</label>
          <input id="ep-amount" type="number" min="0.01" max="${maxAllowed}" step="0.01" value="${p.amount}" /></div>
        <div class="field" style="margin-top:12px"><label for="ep-method">Method</label>
          <select id="ep-method">
            ${['Cash','UPI','Bank Transfer','Other'].map(m =>
              `<option ${p.method === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="margin-top:12px"><label for="ep-note">Note</label>
          <input id="ep-note" value="${Utils.esc(p.note || '')}" /></div>
      `,
      confirmLabel: 'Save changes',
      onConfirm: async (modal) => {
        const amount = Number(modal.querySelector('#ep-amount').value || 0);
        if (!amount || amount <= 0) { Toast.error('Enter a valid amount.'); return false; }
        if (amount > maxAllowed + 0.005) { Toast.error('Pending amount se zyada nahi.'); return false; }
        p.amount = amount;
        p.method = modal.querySelector('#ep-method').value;
        p.note = modal.querySelector('#ep-note').value;
        p.editedAt = Utils.nowISO();
        p.editedBy = s.session.name;
        await DB.put('payments', p);
        await Auth.logAudit(s.session.userId, s.session.name, 'PAYMENT_EDITED',
          `${rec.id} · ${Utils.money(amount)}`);
        await DashboardPage.refreshData();
        Toast.success('Payment updated.');
        return true;
      },
    });
  }

  async function archivePayment(paymentId) {
    if (Store.get().session?.role === 'Manager') { Toast.error('Manager view-only hai.'); return; }
    const s = Store.get();
    const p = (s._payments || []).find(x => x.id === paymentId);
    if (!p) return;
    const rec = (s._records || []).find(r => r.id === p.recordId);

    const ok = await Modal.confirm({
      title: 'Archive this payment?',
      text: 'Removed from Total Received. Recoverable from the database.',
      confirmLabel: 'Archive payment',
      danger: true,
    });
    if (!ok) return;

    p.archived = true;
    p.archivedAt = Utils.nowISO();
    p.archivedBy = s.session.name;
    await DB.put('payments', p);
    await Auth.logAudit(s.session.userId, s.session.name, 'PAYMENT_ARCHIVED',
      `${rec?.id || p.recordId} · ${Utils.money(p.amount)}`);
    await DashboardPage.refreshData();
    Toast.success('Payment archived.');
  }

  function mount(root) {
    Utils.$$('[data-nav]', root).forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.nav;
      if (p === 'reports') return;
      Router.go(p);
    }));

    Utils.$$('[data-action="sync"]', root).forEach(b => b.addEventListener('click', () => {
      Sync.triggerSync();
    }));

    Utils.$$('[data-report-tab]', root).forEach(b =>
      b.addEventListener('click', () => {
        Store.set({ ui: { reportTab: b.dataset.reportTab }});
      }));

    Utils.$$('[data-action="report-apply"]', root).forEach(b =>
      b.addEventListener('click', () => {
        const period = Utils.$('#report-period', root)?.value || 'all';
        const type = Utils.$('#report-type', root)?.value || 'all';
        Store.set({ ui: { reportFilters: { period, type }}});
      }));

    Utils.$$('[data-action="report-reset"]', root).forEach(b =>
      b.addEventListener('click', () => {
        Store.set({ ui: { reportFilters: { period: 'all', type: 'all' }}});
      }));

    Utils.$$('[data-action="export"]', root).forEach(b =>
      b.addEventListener('click', () => exportCSV()));

    Utils.$$('[data-action="pay"]', root).forEach(b =>
      b.addEventListener('click', () => openPaymentModal(b.dataset.id)));

    Utils.$$('[data-action="edit-payment"]', root).forEach(b =>
      b.addEventListener('click', () => openEditPayment(b.dataset.id)));

    Utils.$$('[data-action="archive-payment"]', root).forEach(b =>
      b.addEventListener('click', () => archivePayment(b.dataset.id)));

    Utils.$$('[data-compare-type]', root).forEach(b =>
      b.addEventListener('click', () => {
        Store.set({ ui: { compareChartType: b.dataset.compareType }});
      }));
  }

  return { render, mount };
})();

window.ReportsPage = ReportsPage;