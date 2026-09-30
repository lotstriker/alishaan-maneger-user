/* ============================================================
   ALISHAN · MASTER DATA
   Quality Master + Colour Master, DB-backed with approvals.
   Empty on first install (per blueprint File 19).
   ============================================================ */

const MasterData = (() => {

  /* ---------- In-memory cache ---------- */
  const _state = {
    qualities: { Bra: [], Panty: [], Set: [], Blouse: [] },
    colors: [],
    loaded: false,
  };

  /* ---------- Load from DB ---------- */
  async function load() {
    try {
      const qRow = await DB.get('qualities', 'master');
      const cRow = await DB.get('colors', 'master');

      if (qRow?.value) {
        _state.qualities = {
          Bra:    qRow.value.Bra    || [],
          Panty:  qRow.value.Panty  || [],
          Set:    qRow.value.Set    || [],
          Blouse: qRow.value.Blouse || [],
        };
      } else {
        /* First-run: empty masters per blueprint */
        _state.qualities = { Bra: [], Panty: [], Set: [], Blouse: [] };
        await DB.put('qualities', { id: 'master', value: _state.qualities });
      }

      if (cRow?.value && Array.isArray(cRow.value)) {
        _state.colors = cRow.value;
      } else {
        _state.colors = [];
        await DB.put('colors', { id: 'master', value: _state.colors });
      }

      _state.loaded = true;
    } catch (e) {
      console.error('[MasterData] load failed', e);
    }
  }

  /* ---------- Save to DB ---------- */
  async function save() {
    await DB.put('qualities', { id: 'master', value: _state.qualities });
    await DB.put('colors', { id: 'master', value: _state.colors });
  }

  /* ---------- Getters (approved + active only, for pickers) ---------- */
  function getApprovedQualities(type) {
    const list = _state.qualities[type] || [];
    return list.filter(q => q.status === 'APPROVED' && q.active !== false);
  }

  function getApprovedColors() {
    return _state.colors.filter(c => c.status === 'APPROVED' && c.active !== false);
  }

  /* ---------- Getters (everything, for management screens) ---------- */
  function getAllQualities() {
    return _state.qualities;
  }

  function getAllColors() {
    return _state.colors;
  }

  function findQuality(type, name) {
    const list = _state.qualities[type] || [];
    return list.find(q => Utils.normalize(q.name) === Utils.normalize(name));
  }

  function findColor(name) {
    return _state.colors.find(c => Utils.normalize(c.name) === Utils.normalize(name));
  }

  /* ---------- User submission (goes to PENDING_APPROVAL) ---------- */
  async function submitQuality({ type, name, price, submittedBy, submittedByName }) {
    name = String(name || '').trim().toUpperCase();
    if (!name) return { ok: false, error: 'Name is required.' };
    const p = Number(price);
    if (!p || p <= 0) return { ok: false, error: 'Valid price is required.' };

    const list = _state.qualities[type] || [];
    if (list.some(q => Utils.normalize(q.name) === Utils.normalize(name))) {
      return { ok: false, error: 'This quality name already exists for ' + type + '.' };
    }

    const entry = {
      name, price: p,
      active: true,
      status: 'PENDING_APPROVAL',
      submittedBy, submittedByName,
      submittedAt: Utils.nowISO(),
    };
    _state.qualities[type] = [...list, entry];
    await save();
    await Auth.logAudit(submittedBy, submittedByName, 'MASTER_SUBMITTED',
      `Quality "${name}" for ${type} @ ₹${p}/dozen`);

    return { ok: true, entry };
  }

  async function submitColor({ name, hex, submittedBy, submittedByName }) {
    name = String(name || '').trim();
    if (!name) return { ok: false, error: 'Name is required.' };
    hex = String(hex || '#8c969a').trim();

    if (_state.colors.some(c => Utils.normalize(c.name) === Utils.normalize(name))) {
      return { ok: false, error: 'This colour already exists.' };
    }

    const entry = {
      name, hex,
      active: true,
      status: 'PENDING_APPROVAL',
      submittedBy, submittedByName,
      submittedAt: Utils.nowISO(),
    };
    _state.colors = [..._state.colors, entry];
    await save();
    await Auth.logAudit(submittedBy, submittedByName, 'MASTER_SUBMITTED',
      `Colour "${name}"`);

    return { ok: true, entry };
  }

  /* ---------- Manager: approve / reject ---------- */
  async function approveQuality(type, name, managerId, managerName) {
    const list = _state.qualities[type] || [];
    const idx = list.findIndex(q => Utils.normalize(q.name) === Utils.normalize(name));
    if (idx === -1) return { ok: false, error: 'Not found.' };
    list[idx].status = 'APPROVED';
    list[idx].approvedBy = managerId;
    list[idx].approvedAt = Utils.nowISO();
    _state.qualities[type] = [...list];
    await save();
    await Auth.logAudit(managerId, managerName, 'MASTER_APPROVED', `Quality "${name}" (${type})`);
    return { ok: true };
  }

  async function rejectQuality(type, name, managerId, managerName) {
    const list = _state.qualities[type] || [];
    const idx = list.findIndex(q => Utils.normalize(q.name) === Utils.normalize(name));
    if (idx === -1) return { ok: false, error: 'Not found.' };
    list[idx].status = 'REJECTED';
    list[idx].rejectedBy = managerId;
    list[idx].rejectedAt = Utils.nowISO();
    _state.qualities[type] = [...list];
    await save();
    await Auth.logAudit(managerId, managerName, 'MASTER_REJECTED', `Quality "${name}" (${type})`);
    return { ok: true };
  }

  async function approveColor(name, managerId, managerName) {
    const idx = _state.colors.findIndex(c => Utils.normalize(c.name) === Utils.normalize(name));
    if (idx === -1) return { ok: false, error: 'Not found.' };
    _state.colors[idx].status = 'APPROVED';
    _state.colors[idx].approvedBy = managerId;
    _state.colors[idx].approvedAt = Utils.nowISO();
    _state.colors = [..._state.colors];
    await save();
    await Auth.logAudit(managerId, managerName, 'MASTER_APPROVED', `Colour "${name}"`);
    return { ok: true };
  }

  async function rejectColor(name, managerId, managerName) {
    const idx = _state.colors.findIndex(c => Utils.normalize(c.name) === Utils.normalize(name));
    if (idx === -1) return { ok: false, error: 'Not found.' };
    _state.colors[idx].status = 'REJECTED';
    _state.colors[idx].rejectedBy = managerId;
    _state.colors[idx].rejectedAt = Utils.nowISO();
    _state.colors = [..._state.colors];
    await save();
    await Auth.logAudit(managerId, managerName, 'MASTER_REJECTED', `Colour "${name}"`);
    return { ok: true };
  }

  /* ---------- Manager: update price ---------- */
  async function updateQualityPrice(type, name, newPrice, managerId, managerName) {
    const list = _state.qualities[type] || [];
    const idx = list.findIndex(q => Utils.normalize(q.name) === Utils.normalize(name));
    if (idx === -1) return { ok: false, error: 'Not found.' };
    const old = list[idx].price;
    list[idx].price = Number(newPrice);
    list[idx].priceUpdatedAt = Utils.nowISO();
    list[idx].priceUpdatedBy = managerId;
    _state.qualities[type] = [...list];
    await save();
    await Auth.logAudit(managerId, managerName, 'MASTER_PRICE_UPDATED',
      `"${name}" (${type}): ₹${old} → ₹${newPrice}`);
    return { ok: true };
  }

  /* ---------- Deactivate / reactivate (never delete) ---------- */
  async function setQualityActive(type, name, active, byId, byName) {
    const list = _state.qualities[type] || [];
    const idx = list.findIndex(q => Utils.normalize(q.name) === Utils.normalize(name));
    if (idx === -1) return { ok: false, error: 'Not found.' };
    list[idx].active = !!active;
    _state.qualities[type] = [...list];
    await save();
    await Auth.logAudit(byId, byName,
      active ? 'MASTER_REACTIVATED' : 'MASTER_DEACTIVATED',
      `Quality "${name}" (${type})`);
    return { ok: true };
  }

  async function setColorActive(name, active, byId, byName) {
    const idx = _state.colors.findIndex(c => Utils.normalize(c.name) === Utils.normalize(name));
    if (idx === -1) return { ok: false, error: 'Not found.' };
    _state.colors[idx].active = !!active;
    _state.colors = [..._state.colors];
    await save();
    await Auth.logAudit(byId, byName,
      active ? 'MASTER_REACTIVATED' : 'MASTER_DEACTIVATED',
      `Colour "${name}"`);
    return { ok: true };
  }

  /* ---------- Pending counts ---------- */
  function pendingCount() {
    let n = 0;
    for (const list of Object.values(_state.qualities)) {
      n += list.filter(q => q.status === 'PENDING_APPROVAL').length;
    }
    n += _state.colors.filter(c => c.status === 'PENDING_APPROVAL').length;
    return n;
  }

  function pendingList() {
    const out = [];
    for (const [type, list] of Object.entries(_state.qualities)) {
      list.filter(q => q.status === 'PENDING_APPROVAL').forEach(q => {
        out.push({ kind: 'Quality', type, ...q });
      });
    }
    _state.colors.filter(c => c.status === 'PENDING_APPROVAL').forEach(c => {
      out.push({ kind: 'Colour', ...c });
    });
    return out;
  }

  /* ---------- Import from backup (P0-03 fix) ---------- */
  async function importFromBackup(masters) {
    if (!masters) return;
    try {
      if (masters.qualities) {
        const merged = { ..._state.qualities };
        for (const [type, list] of Object.entries(masters.qualities)) {
          if (!['Bra','Panty','Set','Blouse'].includes(type)) continue;
          if (!Array.isArray(list)) continue;
          const existing = merged[type] || [];
          const existingNames = new Set(existing.map(q => Utils.normalize(q.name)));
          for (const q of list) {
            if (!q?.name) continue;
            const key = Utils.normalize(q.name);
            if (existingNames.has(key)) continue;
            existing.push({
              name: String(q.name).trim().toUpperCase(),
              price: Number(q.price) || 0,
              active: q.active !== false,
              status: q.status || 'APPROVED',
              createdAt: q.createdAt || Utils.nowISO(),
              importedAt: Utils.nowISO(),
            });
            existingNames.add(key);
          }
          merged[type] = existing;
        }
        _state.qualities = merged;
      }

      if (Array.isArray(masters.colors)) {
        const existing = _state.colors || [];
        const existingNames = new Set(existing.map(c => Utils.normalize(c.name)));
        for (const c of masters.colors) {
          if (!c?.name) continue;
          const key = Utils.normalize(c.name);
          if (existingNames.has(key)) continue;
          existing.push({
            name: String(c.name).trim(),
            hex: String(c.hex || '#8c969a'),
            active: c.active !== false,
            status: c.status || 'APPROVED',
            createdAt: c.createdAt || Utils.nowISO(),
            importedAt: Utils.nowISO(),
          });
          existingNames.add(key);
        }
        _state.colors = existing;
      }

      await save();
    } catch (e) {
      console.error('[MasterData] importFromBackup failed', e);
    }
  }

  return {
    load, save,
    getApprovedQualities, getApprovedColors,
    getAllQualities, getAllColors,
    findQuality, findColor,
    submitQuality, submitColor,
    approveQuality, rejectQuality,
    approveColor, rejectColor,
    updateQualityPrice, setQualityActive, setColorActive,
    pendingCount, pendingList,
    importFromBackup,
  };
})();

window.MasterData = MasterData;