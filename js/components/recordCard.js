/* ============================================================
   ALISHAN · RECORD CARD
   Collapsed card + inline-expand detail + inline edit mode.
   Edit-history entries now ALSO written to editHistory store.
   Status toggle in edit mode (Completed ↔ Incomplete).
   ============================================================ */

const RecordCard = (() => {

  /* ---------- Collapsed card ---------- */
  function renderCollapsed(rec, { selectable = false, selected = false, showOwner = false } = {}) {
    const c = Calc.compute(rec);
    const statusBadge = rec.status === 'COMPLETED'
      ? `<span class="badge completed">Completed</span>`
      : `<span class="badge incomplete">Incomplete</span>`;

    const lot = rec.lot
      ? `<span class="lot">[${Utils.esc(rec.lot)}]</span>`
      : `<span class="lot italic" style="opacity:.7;">no lot number yet</span>`;

    const owner = showOwner
      ? `<div class="owner-row">👤 ${Utils.esc(rec.ownerName || rec.ownerId)}</div>`
      : '';

    return `
      <article class="record card" data-record-id="${Utils.esc(rec.id)}">
        ${selectable ? `
          <input type="checkbox" class="record-check" data-select-id="${Utils.esc(rec.id)}"
                 aria-label="Select record ${Utils.esc(rec.id)}"
                 ${selected ? 'checked' : ''} />
        ` : ''}
        <div class="record-head" data-expand="${Utils.esc(rec.id)}">
          <div class="record-title">
            <div>${Utils.esc(rec.quality)} ${lot}</div>
            ${statusBadge}
          </div>
          ${owner}
          ${StatBox.render([
            { value: Utils.dozen(c.totalDozen), label: 'dozen' },
            { value: rec.colors.length,        label: 'colours' },
            { value: Utils.ago(rec.entryDate), label: 'added' },
          ])}
          <div class="record-foot">
            <span class="id mono">${Utils.esc(rec.id)} · ${Utils.esc(rec.type)} · Cup ${Utils.esc(rec.cup)}</span>
            <span class="amount">${Utils.money(c.amount)}</span>
          </div>
        </div>
      </article>
    `;
  }

  /* ---------- Full detail (expanded, view mode) ---------- */
  function renderDetail(rec, allPayments, opts = {}) {
    const isManagerView = !!opts.isManagerView;
    const c = Calc.compute(rec);
    const received = Calc.totalReceived(rec, allPayments);
    const pending  = Math.max(0, c.amount - received);
    const ps = Calc.paymentStatus(rec, allPayments);

    const colorsHtml = rec.colors.map(name => {
      const col = MasterData.findColor(name) || { hex: '#999' };
      return `
        <div class="color-cell">
          <i class="dot" style="background:${Utils.esc(col.hex)}"></i>
          <span>${Utils.esc(name)}</span>
        </div>
      `;
    }).join('');

    const quantitiesHtml = renderQuantitiesBlock(rec, c);

    const paymentBox = rec.paymentTracked
      ? StatBox.render([
          { value: Utils.money(c.amount),  label: 'Total' },
          { value: Utils.money(received), label: 'Received', tone: 'success' },
          { value: Utils.money(pending),  label: 'Pending',  tone: 'warning' },
        ])
      : `<div class="notice">Payment tracking off — historical entry</div>`;

    const actions = isManagerView
      ? `<div class="actions">
          <button class="btn danger" data-action="archive" data-id="${Utils.esc(rec.id)}">
            Archive This Entry
          </button>
        </div>`
      : `<div class="actions">
          <button class="btn" data-action="edit" data-id="${Utils.esc(rec.id)}">Edit</button>
          <button class="btn danger" data-action="archive" data-id="${Utils.esc(rec.id)}">Delete → Archive</button>
        </div>
        ${rec.status === 'INCOMPLETE' ? `
          <button class="btn success full" style="margin-top:8px" data-action="complete" data-id="${Utils.esc(rec.id)}">
            Mark as Completed
          </button>
        ` : ''}
        ${rec.paymentTracked && ps !== 'paid' ? `
          <button class="btn primary full" style="margin-top:8px" data-action="add-payment" data-id="${Utils.esc(rec.id)}">
            ＋ Add Payment
          </button>
        ` : ''}
        `;

    return `
      <div class="expanded" data-expanded-for="${Utils.esc(rec.id)}">
        <h4>Quality detail</h4>
        ${StatBox.render([
          { value: `Cup ${Utils.esc(rec.cup)}`, label: 'Cup' },
          { value: Utils.money(rec.priceSnapshot), label: 'Price / dozen' },
          { value: rec.mode === 'same' ? 'Shared' : 'By colour', label: 'Quantity mode' },
        ])}

        <h4>Colours & quantities</h4>
        <div class="colour-display">${colorsHtml || '<span class="hint">No colours.</span>'}</div>
        <div style="margin-top:12px;">
          ${quantitiesHtml}
        </div>

        <h4>Payment</h4>
        ${paymentBox}

        <h4>Details</h4>
        <div class="details-grid">
          <div><span>Lot number</span><strong>${rec.lot ? Utils.esc(rec.lot) : '<em class="muted">no lot number yet</em>'}</strong></div>
          <div><span>Weight</span><strong>${rec.weight ? Utils.esc(rec.weight) + ' kg' : '—'}</strong></div>
          <div><span>Meter</span><strong>${rec.meter ? Utils.esc(rec.meter) + ' m' : '—'}</strong></div>
          <div><span>Maal gaya</span><strong>${rec.maalGaya ? Utils.esc(rec.maalGaya) : '<em class="muted">not sent yet</em>'}</strong></div>
          <div><span>Entry date</span><strong>${Utils.fmtDate(rec.entryDate)}</strong></div>
          <div><span>Last modified</span><strong>${Utils.ago(rec.lastModified)}</strong></div>
        </div>

        ${rec.notes ? `<div class="notes" style="margin-top:10px;">${Utils.esc(rec.notes)}</div>` : ''}

        ${rec.history?.length ? `
          <details class="history-details" style="margin-top:12px;">
            <summary class="muted" style="cursor:pointer;font-size:.82rem;font-weight:700;">
              View edit history (${rec.history.length})
            </summary>
            <div class="history-list">
              ${rec.history.slice().reverse().map(h => `
                <div class="history-row">
                  <span class="muted">${Utils.esc(h.field)}:</span>
                  <span><del>${Utils.esc(typeof h.old === 'object' ? '(changed)' : (h.old || '—'))}</del> → <ins>${Utils.esc(typeof h.new === 'object' ? '(changed)' : (h.new || '—'))}</ins></span>
                  <span class="muted">${Utils.esc(h.when)}</span>
                </div>
              `).join('')}
            </div>
          </details>
        ` : ''}

        ${actions}
      </div>
    `;
  }

  /* ---------- Quantities block (view) ---------- */
  function renderQuantitiesBlock(rec, c) {
    if (rec.mode === 'different') {
      const byColor = rec.quantitiesByColor || {};
      return rec.colors.map(name => {
        const q = byColor[name] || Calc.emptyQuantities();
        const sub = Calc.computeForQuantities(q, rec.priceSnapshot);
        return `
          <div class="color-group">
            <div class="color-group-head">
              ${StatBox.render([
                { value: Utils.esc(name), label: 'colour' },
                { value: Utils.dozen(sub.totalDozen), label: 'dozen' },
                { value: Utils.money(sub.amount), label: 'value', tone: 'accent' },
              ])}
            </div>
            <div class="color-group-body">${SizeGrid.renderReadOnly(q)}</div>
          </div>
        `;
      }).join('');
    }
    return `
      ${SizeGrid.renderReadOnly(rec.quantities)}
      <div class="total-row">
        <span class="muted">total: ${Utils.dozen(c.totalDozen)} dozen</span>
        <strong>${Utils.money(c.amount)}</strong>
      </div>
    `;
  }

  /* ---------- Edit mode ---------- */
  function renderEdit(rec, draft) {
    const masterQualities = MasterData.getApprovedQualities(rec.type);

    return `
      <div class="expanded edit-mode" data-edit-for="${Utils.esc(rec.id)}">
        <div class="edit-head">
          <div>
            <h3>Edit ${Utils.esc(rec.id)}</h3>
            <p class="muted" style="font-size:.8rem;">
              Quality type is locked. Changes append to history.
            </p>
          </div>
          <button class="btn small" data-action="cancel-edit">Cancel</button>
        </div>

        <div class="form-grid">
          <div class="field">
            <label for="edit-type">Quality type (locked)</label>
            <input id="edit-type" value="${Utils.esc(rec.type)}" disabled />
          </div>
          <div class="field">
            <label for="edit-quality">Quality name</label>
            <input id="edit-quality" list="edit-quality-list" value="${Utils.esc(draft.quality)}" />
            <datalist id="edit-quality-list">
              ${masterQualities.map(q => `<option value="${Utils.esc(q.name)}">${Utils.money(q.price)}/dozen</option>`).join('')}
            </datalist>
          </div>
          <div class="field">
            <label>Cup</label>
            <div class="choice-row" role="group" aria-label="Cup">
              ${['A','B','C','D','E','F'].map(x => `
                <button type="button" class="choice ${draft.cup === x ? 'active' : ''}"
                        data-edit-cup="${x}">${x}</button>
              `).join('')}
            </div>
          </div>
          <div class="field">
            <label for="edit-lot">Lot number</label>
            <input id="edit-lot" value="${Utils.esc(draft.lot)}" placeholder="First added here" />
          </div>
          <div class="field">
            <label for="edit-maal">Maal gaya</label>
            <input id="edit-maal" value="${Utils.esc(draft.maalGaya)}" placeholder="Destination" />
          </div>
          <div class="field">
            <label for="edit-weight">Weight (kg)</label>
            <input id="edit-weight" type="number" min="0" step="0.01" value="${Utils.esc(draft.weight)}" />
          </div>
          <div class="field">
            <label for="edit-meter">Meter</label>
            <input id="edit-meter" type="number" min="0" step="0.01" value="${Utils.esc(draft.meter)}" />
          </div>
          <div class="field full">
            <label for="edit-notes">Notes</label>
            <textarea id="edit-notes" placeholder="Add a note…">${Utils.esc(draft.notes)}</textarea>
          </div>
        </div>

        <!-- Status control (P1-02 fix) -->
        <h4 style="margin-top:16px">Status</h4>
        <div class="field">
          <label>Change status</label>
          <div class="segmented" role="group" aria-label="Status">
            <button type="button" class="${draft.status === 'INCOMPLETE' ? 'active' : ''}"
                    data-edit-status="INCOMPLETE">Incomplete</button>
            <button type="button" class="${draft.status === 'COMPLETED' ? 'active' : ''}"
                    data-edit-status="COMPLETED">Completed</button>
          </div>
          <div class="hint">
            Same as the "Mark as Completed" button on the card. You can switch back to Incomplete if marked by mistake.
          </div>
        </div>

        <h4 style="margin-top:16px">Colours</h4>
        <div class="edit-colors">
          ${MasterData.getApprovedColors().map(col => {
            const on = draft.colors.includes(col.name);
            return `
              <button type="button" class="color-cell-btn ${on ? 'on' : ''}"
                      data-edit-color="${Utils.esc(col.name)}">
                <i class="dot" style="background:${Utils.esc(col.hex)}"></i>
                <span>${Utils.esc(col.name)}</span>
                ${on ? '✓' : ''}
              </button>
            `;
          }).join('')}
        </div>

        <h4 style="margin-top:16px">Quantity mode</h4>
        <div class="segmented" role="group" aria-label="Quantity mode">
          <button type="button" class="${draft.mode === 'same' ? 'active' : ''}"
                  data-edit-mode="same">Same for all colours</button>
          <button type="button" class="${draft.mode === 'different' ? 'active' : ''}"
                  data-edit-mode="different">Different by colour</button>
        </div>

        <h4 style="margin-top:16px">Quantities</h4>
        ${renderEditQuantities(rec, draft)}

        <div class="edit-actions">
          <span class="muted" style="font-size:.75rem;">
            Last modified: ${Utils.ago(rec.lastModified)}
          </span>
          <button class="btn primary" data-action="save-edit" data-id="${Utils.esc(rec.id)}">
            Save Changes
          </button>
        </div>
      </div>
    `;
  }

  function renderEditQuantities(rec, draft) {
    if (draft.mode === 'different') {
      return draft.colors.map(name => {
        const q = draft.quantitiesByColor?.[name] || Calc.emptyQuantities();
        return `
          <div class="color-group">
            <div class="color-group-head-inline">
              <strong>${Utils.esc(name)}</strong>
            </div>
            ${SizeGrid.renderEdit(q, name)}
          </div>
        `;
      }).join('');
    }
    return SizeGrid.renderEdit(draft.quantities, null);
  }

  return { renderCollapsed, renderDetail, renderEdit };
})();

window.RecordCard = RecordCard;