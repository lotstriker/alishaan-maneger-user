/* ============================================================
   ALISHAN · SIZE GRID
   Hybrid tap-to-expand chip grid (Add Quality form).
   Read-only split-box grid (view mode).
   Editable split-box grid (edit mode).
   ============================================================ */

const SizeGrid = (() => {

  /* ---------- Add Quality: tap-to-expand chip hybrid ---------- */
  function renderEditableHybrid({ quantities, openSizes, rate, color = null }) {
    const total = Calc.computeForQuantities(quantities, rate);

    const chips = Calc.SIZES.map(s => {
      const on = openSizes.includes(s);
      const hasVal = (quantities?.[s]?.dozens || quantities?.[s]?.pieces);
      const mark = on ? ' ✓' : (hasVal ? ' •' : '');
      const dataAttr = color
        ? `data-color-size="${Utils.esc(color)}::${s}"`
        : `data-form-size="${s}"`;
      return `
        <button type="button" class="choice size-chip ${on ? 'active' : ''}" ${dataAttr}>
          ${s}${mark}
        </button>
      `;
    }).join('');

    const inputs = openSizes.map(s => {
      const v = quantities?.[s] || { dozens:0, pieces:0 };
      const dAttr = color ? `data-color-dozens="${Utils.esc(color)}::${s}"` : `data-size-dozens="${s}"`;
      const pAttr = color ? `data-color-pieces="${Utils.esc(color)}::${s}"` : `data-size-pieces="${s}"`;
      return `
        <div class="size-inputs">
          <label>Size ${s} · Dozen
            <input type="number" min="0" step="1" value="${v.dozens || 0}" ${dAttr} />
          </label>
          <label>Pieces (0–11)
            <input type="number" min="0" max="11" step="1" value="${v.pieces || 0}" ${pAttr} />
          </label>
        </div>
      `;
    }).join('');

    return {
      header: `
        <div class="live-total">
          <span>Total: ${Utils.dozen(total.totalDozen)} dozen</span>
          <span>${Utils.money(total.amount)}</span>
        </div>
      `,
      chipsHtml: `<div class="size-row">${chips}</div>`,
      inputsHtml: inputs,
      total,
    };
  }

  /* ---------- View mode: read-only split boxes ---------- */
  function renderReadOnly(quantities) {
    const filled = Calc.SIZES.filter(s => {
      const v = quantities?.[s];
      return v && (v.dozens || v.pieces);
    });

    if (!filled.length) return `<span class="hint">No filled sizes.</span>`;

    return `
      <div class="size-grid">
        ${filled.map(s => {
          const v = quantities[s];
          return `
            <div class="size-box">
              <div class="size-label">${s}</div>
              <div class="nums">
                <div>${v.dozens || 0}<small>dozen</small></div>
                <div>${v.pieces || 0}<small>pieces</small></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /* ---------- Edit mode: split boxes with live inputs ---------- */
  function renderEdit(quantities, color = null) {
    return `
      <div class="size-grid">
        ${Calc.SIZES.map(s => {
          const v = quantities?.[s] || { dozens:0, pieces:0 };
          const prefix = color ? Utils.esc(color) + '::' : '::';
          return `
            <div class="size-box editable">
              <div class="size-label">${s}</div>
              <div class="nums">
                <div><input type="number" min="0" step="1"
                    value="${v.dozens || 0}"
                    data-edit-dozens="${prefix}${s}" /></div>
                <div><input type="number" min="0" max="11" step="1"
                    value="${v.pieces || 0}"
                    data-edit-pieces="${prefix}${s}" /></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return { renderEditableHybrid, renderReadOnly, renderEdit };
})();

window.SizeGrid = SizeGrid;