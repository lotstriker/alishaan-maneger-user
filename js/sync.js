/* ============================================================
   ALISHAN · SYNC ENGINE (honest stub)
   Currently: client-only, no backend.
   Sync indicator shows "Local only" until a real backend is attached.
   ============================================================ */

const Sync = (() => {

  let _initialized = false;
  const BACKEND_ATTACHED = false;   /* flip to true when a real backend exists */

  function init() {
    if (_initialized) return;
    _initialized = true;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    Store.set({
      app: { ...Store.get().app, online: navigator.onLine },
    });
  }

  function handleOnline() {
    const s = Store.get();
    Store.set({ app: { ...s.app, online: true } });
    Toast.success('Back online.');
    /* No auto-sync until backend exists */
  }

  function handleOffline() {
    const s = Store.get();
    Store.set({ app: { ...s.app, online: false } });
    Toast.warning('Offline — changes will queue locally.');
  }

  /* ---------- Queue ---------- */
  async function queueChange(kind, payload = {}) {
    const s = Store.get();
    const pending = s.app.queuedChanges || 0;
    Store.set({
      app: { ...s.app, queuedChanges: pending + 1 },
    });
    /* In real backend: push to server here.
       For now: no-op — the change is already saved to IndexedDB. */
    return { ok: true, kind, payload };
  }

  /* ---------- Manual trigger ---------- */
  async function triggerSync() {
    const s = Store.get();
    if (!s.app.online) {
      Toast.warning('Offline — no sync possible.');
      return false;
    }

    if (!BACKEND_ATTACHED) {
      Toast.warning('Sync backend not yet connected. Changes are saved locally.');
      return false;
    }

    /* Real sync path — placeholder for future */
    Store.set({ app: { ...s.app, syncing: true } });
    await new Promise(r => setTimeout(r, 400));
    Store.set({
      app: {
        ...Store.get().app,
        syncing: false,
        queuedChanges: 0,
        lastSynced: Utils.nowISO(),
      },
    });
    return true;
  }

  /* ---------- Status ---------- */
  function status() {
    const s = Store.get();
    const queued = s.app.queuedChanges || 0;

    if (!s.app.online) return { state: 'offline', queued, label: 'Offline' };
    if (s.app.syncing) return { state: 'syncing', queued, label: 'Syncing…' };
    if (!BACKEND_ATTACHED) return { state: 'local', queued, label: 'Local only' };
    if (queued > 0) return { state: 'syncing', queued, label: `Syncing · ${queued}` };
    return { state: 'synced', queued: 0, label: 'Synced' };
  }

  /* ---------- Status color helper for headers ---------- */
  function statusColor(state) {
    return {
      offline: 'var(--danger)',
      syncing: 'var(--warning)',
      local:   'var(--text-faint)',
      synced:  'var(--success)',
    }[state] || 'var(--text-faint)';
  }

  return {
    init,
    queueChange,
    triggerSync,
    status,
    statusColor,
  };
})();

window.Sync = Sync;