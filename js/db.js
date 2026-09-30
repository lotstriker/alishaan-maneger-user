/* ============================================================
   ALISHAN · DB (IndexedDB wrapper)
   Object stores:
     users, records, payments, qualities, colors,
     settings, searchAnalytics, editHistory, auditLog,
     backups, backupSnapshots
   ============================================================ */

const DB = (() => {
  const DB_NAME = 'alishan-app';
  const DB_VERSION = 2;

  const STORES = {
    users:            { keyPath: 'id' },
    records:          { keyPath: 'id' },
    payments:         { keyPath: 'id' },
    qualities:        { keyPath: 'id' },
    colors:           { keyPath: 'id' },
    settings:         { keyPath: 'key' },
    searchAnalytics:  { keyPath: 'id' },
    editHistory:      { keyPath: 'id' },
    auditLog:         { keyPath: 'id' },
    backups:          { keyPath: 'id' },
    backupSnapshots:  { keyPath: 'id' },
  };

  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        for (const [name, cfg] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: cfg.keyPath });
            if (name === 'records') {
              store.createIndex('ownerId', 'ownerId', { unique: false });
              store.createIndex('status', 'status', { unique: false });
              store.createIndex('createdAt', 'createdAt', { unique: false });
            }
            if (name === 'payments') {
              store.createIndex('recordId', 'recordId', { unique: false });
            }
            if (name === 'editHistory') {
              store.createIndex('recordId', 'recordId', { unique: false });
            }
            if (name === 'auditLog') {
              store.createIndex('at', 'at', { unique: false });
              store.createIndex('userId', 'userId', { unique: false });
            }
          }
        }
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror   = () => reject(req.error);
    });
  }

  function tx(storeName, mode = 'readonly') {
    if (!_db) throw new Error('DB not open');
    return _db.transaction(storeName, mode).objectStore(storeName);
  }

  function put(storeName, value) {
    return new Promise((resolve, reject) => {
      const r = tx(storeName, 'readwrite').put(value);
      r.onsuccess = () => resolve(value);
      r.onerror   = () => reject(r.error);
    });
  }

  function putMany(storeName, values) {
    return new Promise((resolve, reject) => {
      const t = _db.transaction(storeName, 'readwrite');
      const s = t.objectStore(storeName);
      for (const v of values) s.put(v);
      t.oncomplete = () => resolve(values);
      t.onerror    = () => reject(t.error);
    });
  }

  function get(storeName, key) {
    return new Promise((resolve, reject) => {
      const r = tx(storeName).get(key);
      r.onsuccess = () => resolve(r.result);
      r.onerror   = () => reject(r.error);
    });
  }

  function getAll(storeName) {
    return new Promise((resolve, reject) => {
      const r = tx(storeName).getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror   = () => reject(r.error);
    });
  }

  function getAllByIndex(storeName, indexName, key) {
    return new Promise((resolve, reject) => {
      const r = tx(storeName).index(indexName).getAll(key);
      r.onsuccess = () => resolve(r.result || []);
      r.onerror   = () => reject(r.error);
    });
  }

  function del(storeName, key) {
    return new Promise((resolve, reject) => {
      const r = tx(storeName, 'readwrite').delete(key);
      r.onsuccess = () => resolve(true);
      r.onerror   = () => reject(r.error);
    });
  }

  function clear(storeName) {
    return new Promise((resolve, reject) => {
      const r = tx(storeName, 'readwrite').clear();
      r.onsuccess = () => resolve(true);
      r.onerror   = () => reject(r.error);
    });
  }

  function count(storeName) {
    return new Promise((resolve, reject) => {
      const r = tx(storeName).count();
      r.onsuccess = () => resolve(r.result);
      r.onerror   = () => reject(r.error);
    });
  }

  /* ---------- Per-user settings helpers ---------- */
  async function getPrefs(userId) {
    if (!userId) return null;
    const row = await get('settings', `prefs:${userId}`);
    return row?.value || null;
  }

  async function setPrefs(userId, prefs) {
    if (!userId) return;
    await put('settings', { key: `prefs:${userId}`, value: prefs });
  }

  async function getNotifications(userId) {
    if (!userId) return null;
    const row = await get('settings', `notifications:${userId}`);
    return row?.value || null;
  }

  async function setNotifications(userId, notifications) {
    if (!userId) return;
    await put('settings', { key: `notifications:${userId}`, value: notifications });
  }

  async function getGlobal() {
    const row = await get('settings', 'global');
    return row?.value || { trackingPeriod: 'weekly', twoFAEnforced: false };
  }

  async function setGlobal(globals) {
    await put('settings', { key: 'global', value: globals });
  }

  /* ---------- Edit History helpers (P1-03 fix) ---------- */
  async function appendHistory(recordId, entry) {
    if (!recordId) return;
    await put('editHistory', {
      id: Utils.uid('H'),
      recordId,
      field: entry.field,
      old: entry.old,
      new: entry.new,
      who: entry.who,
      when: entry.when || Utils.nowISO(),
    });
  }

  async function getHistory(recordId) {
    return getAllByIndex('editHistory', 'recordId', recordId);
  }

  return {
    open, put, putMany, get, getAll, getAllByIndex, del, clear, count,
    getPrefs, setPrefs, getNotifications, setNotifications, getGlobal, setGlobal,
    appendHistory, getHistory,
    STORES,
  };
})();

window.DB = DB;