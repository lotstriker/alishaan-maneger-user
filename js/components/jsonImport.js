/* ============================================================
   ALISHAN · JSON IMPORT HELPER
   Parses master-data JSON (qualities + colors).
   ============================================================ */

const JSONImport = (() => {

  function parseMasterJSON(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: 'Invalid JSON format.' };
    }

    const qualities = {};
    const colors = [];

    if (data.qualities) {
      if (typeof data.qualities !== 'object') {
        return { ok: false, error: 'qualities must be an object.' };
      }
      for (const [type, list] of Object.entries(data.qualities)) {
        if (!['Bra','Panty','Set','Blouse'].includes(type)) continue;
        if (!Array.isArray(list)) continue;
        qualities[type] = list
          .filter(q => q && q.name && q.price != null)
          .map(q => ({
            name: String(q.name).trim().toUpperCase(),
            price: Number(q.price),
          }))
          .filter(q => q.name && q.price > 0);
      }
    }

    if (Array.isArray(data.colors)) {
      for (const c of data.colors) {
        if (!c || !c.name) continue;
        colors.push({
          name: String(c.name).trim(),
          hex: String(c.hex || '#8c969a').trim(),
        });
      }
    }

    if (!Object.keys(qualities).length && !colors.length) {
      return { ok: false, error: 'No valid qualities or colours found.' };
    }

    return { ok: true, qualities, colors };
  }

  return { parseMasterJSON };
})();

window.JSONImport = JSONImport;