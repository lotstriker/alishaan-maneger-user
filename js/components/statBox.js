/* ============================================================
   ALISHAN · STAT-BOX
   The "divided stat-box" — the single most-repeated component.
   ============================================================ */

const StatBox = (() => {

  function render(cells, opts = {}) {
    const cls = 'stat-box' + (opts.className ? ' ' + opts.className : '');
    const inner = cells.map(c => {
      const valueCls = 'value' + (c.tone ? ' ' + c.tone : '');
      return `
        <div class="cell">
          <div class="${valueCls}">${c.value}</div>
          <div class="label">${Utils.esc(c.label || '')}</div>
        </div>
      `;
    }).join('');
    return `<div class="${cls}">${inner}</div>`;
  }

  function overview({ label, value, icon = '', sub = '', key = '', selected = false }) {
    const sel = selected ? ' selected' : '';
    return `
      <button class="overview-card${sel}" data-card="${Utils.esc(key)}" type="button">
        <div class="head">
          ${icon ? `<span class="icon">${icon}</span>` : ''}
          <span>${Utils.esc(label)}</span>
        </div>
        <div class="value">${value}</div>
        ${sub ? `<div class="sub">${Utils.esc(sub)}</div>` : ''}
      </button>
    `;
  }

  return { render, overview };
})();

window.StatBox = StatBox;