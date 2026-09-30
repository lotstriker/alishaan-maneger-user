/* ============================================================
   ALISHAN · STORE
   Central reactive-ish state + pub/sub.
   Preferences and notifications are per-user (loaded on login).

   PHASE 1 FIX (P0-01):
   - Centralized render scheduling via requestAnimationFrame.
   - Store.set() automatically schedules a render.
   - Coalesces multiple set() calls in the same frame.
   - Prevents infinite loops via _renderScheduled guard.
   - setSilent() for state updates that should NOT trigger render.

   PHASE 1 FIX (P0-01b):
   - Route changes handled by Router directly, not by render callback.
   - Render callback only handles same-route UI updates.
   ============================================================ */

const Store = (() => {
  const _state = {
    ready: false,
    bootedAt: null,

    /* Auth */
    session: null,
    loginError: null,

    /* Per-user prefs (loaded from DB on login) */
    prefs: {
      theme: 'system',
      amoled: false,
      compact: false,
      contrast: false,
      font: 'medium',
      accent: 'blue',
      language: 'English',
      period: 'weekly',
      defaultMode: 'same',
      defaultSort: 'newest',
      haptic: true,
      performance: false,
      autoBackup: false,
      autoBackupFrequency: 'weekly',
    },

    /* Per-user notifications (loaded from DB on login) */
    notifications: {
      pending: true,
      aging: true,
      report: true,
      backup: false,
      approval: true,
      newUser: true,
      push: true,
      email: true,
      emailAddress: '',
      quietFrom: '22:00',
      quietTo: '06:00',
    },

    /* App-wide (per-device) */
    app: {
      online: navigator.onLine,
      syncing: false,
      queuedChanges: 0,
      lastSynced: null,
      wifiOnly: false,
    },

    /* Global (shared, Manager-controlled) */
    _globalSettings: {
      trackingPeriod: 'weekly',
      twoFAEnforced: false,
    },

    /* Routing */
    route: 'login',
    routeParams: {},

    /* UI state */
    ui: {
      expandedId: null,
      editingId: null,
      editDraft: null,
      paymentFor: null,
      filters: {},
      search: '',
      sort: 'newest',
      page: 1,
      showFilterPanel: false,
      selectMode: false,
      selectedIds: [],
      groupBy: false,
      reportTab: 'pending',
      reportPage: 1,
      reportFilters: { period: 'all', type: 'all' },
      settingsTab: 'appearance',
      addForm: null,
      colorSearch: '',
      compareChartType: 'line',
    },

    /* Data caches */
    _records: [],
    _payments: [],
    _users: [],
    _auditLog: [],
    _searchAnalytics: [],
  };

  const listeners = new Set();

  /* ---------- Render scheduling (PHASE 1 FIX) ---------- */
  let _renderScheduled = false;
  let _renderCallback = null;
  let _suppressRender = 0;

  function setRenderCallback(cb) {
    _renderCallback = typeof cb === 'function' ? cb : null;
  }

  function scheduleRender() {
    if (_suppressRender > 0) return;
    if (_renderScheduled) return;
    if (!_renderCallback) return;
    _renderScheduled = true;
    requestAnimationFrame(() => {
      _renderScheduled = false;
      try {
        _renderCallback();
      } catch (e) {
        console.error('[store] render callback error', e);
      }
    });
  }

  function batch(fn) {
    _suppressRender++;
    try { fn(); }
    finally {
      _suppressRender--;
      if (_suppressRender === 0) scheduleRender();
    }
  }

  /* ---------- Core state API ---------- */
  function get() { return _state; }

  function set(patch) {
    if (typeof patch === 'function') patch = patch(_state);
    if (!patch) return;
    deepAssign(_state, patch);
    notify();
  }

  /**
   * Silent set — updates state but does NOT trigger render.
   * Use for internal bookkeeping (like route name sync) that
   * should not cause a re-render.
   */
  function setSilent(patch) {
    if (typeof patch === 'function') patch = patch(_state);
    if (!patch) return;
    deepAssign(_state, patch);
  }

  function deepAssign(target, patch) {
    for (const [k, v] of Object.entries(patch)) {
      if (k !== 'filters' && k !== 'reportFilters' && v && typeof v === 'object' && !Array.isArray(v) &&
          target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
        deepAssign(target[k], v);
      } else {
        target[k] = v;
      }
    }
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify() {
    for (const fn of listeners) {
      try { fn(_state); } catch (e) { console.error('[store] listener error', e); }
    }
    scheduleRender();
  }

  function isManager() { return _state.session?.role === 'Manager'; }
  function isUser()    { return _state.session?.role === 'User'; }
  function currentUserId() { return _state.session?.userId || null; }

  return {
    get, set, setSilent, subscribe, notify,
    isManager, isUser, currentUserId,
    setRenderCallback, scheduleRender, batch,
  };
})();

window.Store = Store;