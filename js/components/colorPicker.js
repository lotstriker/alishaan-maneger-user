/* ============================================================
   ALISHAN · COLOR PICKER
   Search + selected chips + swatch grid.
   Used inside Add Quality form and Edit mode.
   ============================================================ */

const ColorPicker = (() => {

  function render(allColors, selected = [], searchValue = '') {
    const q = Utils.normalize(searchValue);
    const filtered = allColors.filter(c => !q || Utils.normalize(c.name).includes(q));

    const selectedHtml = selected.length
      ? selected.map(name => {
          const c = allColors.find(x => x.name === name) || { hex: '#999' };
          return `
            <button type="button" class="color-chip" data-form-color="${Utils.esc(name)}">
              <i class="dot" style="background:${Utils.esc(c.hex)}"></i>
              ${Utils.esc(name)} <span style="opacity:.6;font-weight:900;">×</span>
            </button>
          `;
        }).join('')
      : `<span class="hint">Select at least one colour.</span>`;

    const swatches = filtered.length
      ? filtered.map(c => {
          const on = selected.includes(c.name);
          return `
            <button type="button" class="swatch ${on ? 'selected' : ''}" data-form-color="${Utils.esc(c.name)}">
              <i class="dot" style="background:${Utils.esc(c.hex)}"></i>
              <span>${Utils.esc(c.name)}</span>
              ${on ? `<span style="margin-left:auto;color:var(--accent);font-weight:900;">✓</span>` : ''}
            </button>
          `;
        }).join('')
      : `<span class="hint">No colours match "${Utils.esc(searchValue)}".</span>`;

    return `
      <div class="field full">
        <label for="color-search">Colours</label>
        <div class="color-search">
          <input id="color-search" value="${Utils.esc(searchValue)}" placeholder="Search colours…" />
        </div>
        <div class="selected-colors">${selectedHtml}</div>
        <div class="swatches">${swatches}</div>
      </div>
    `;
  }

  return { render };
})();

window.ColorPicker = ColorPicker;