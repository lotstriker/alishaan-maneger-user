/* ============================================================
   ALISHAN · MAIN
   Bootstrap: open DB, seed, load data, apply prefs, restore
   session, init sync, route.

   PHASE 1 FIX (P0-01):
   - Centralized render callback wired to Store.
   - Focus preservation across re-renders.
   - Scroll-to-top only on route change, not same-route render.

   PHASE 1 FIX (P0-01b):
   - Route changes handled by Router directly, not here.
   - Render callback only handles same-route UI updates.
   - Prevents double render when navigating.
   ============================================================ */

(async function bootstrap() {
  console.log('%cAlishan · booting', 'color:#2f8fa6;font-weight:700;');

  /* ---------- 1. Open IndexedDB ---------- */
  try {
    await DB.open();
    console.log('  ✓ IndexedDB ready');
  } catch (e) {
    console.error('  ✗ IndexedDB failed', e);
    document.getElementById('app-root').innerHTML =
      `<div style="padding:40px;text-align:center;font-family:system-ui;">
        <h2>Storage unavailable</h2>
        <p>This app needs IndexedDB. Please enable it or use a supported browser.</p>
      </div>`;
    return;
  }

  /* ---------- 2. Seed first-run data ---------- */
  await Seed.run();

  /* ---------- 3. Load shared data into Store ---------- */
  await MasterData.load();
  const records   = await DB.getAll('records');
  const payments  = await DB.getAll('payments');
  const users     = await DB.getAll('users');
  const auditLog  = await DB.getAll('auditLog');
  const analytics = await DB.getAll('searchAnalytics');
  const globals   = await DB.getGlobal();

  Store.setSilent({
    _records: records,
    _payments: payments,
    _users: users,
    _auditLog: auditLog,
    _searchAnalytics: analytics,
    _globalSettings: globals,
  });

  /* ---------- 4. Restore session ---------- */
  const session = await Auth.restoreSession();
  if (session) {
    Store.setSilent({ session });
    await loadUserScopedSettings(session.userId);
  }

  /* ---------- 5. Init sync engine ---------- */
  Sync.init();

  /* ---------- 6. Wire centralized render callback ---------- */
  /* Only handles SAME-ROUTE UI updates. Route changes are handled by
     Router.go() directly — no double render. */
  let _lastRenderedRoute = Store.get().route || 'login';

  Store.setRenderCallback(() => {
    const currentRoute = Router.parseHash().name || 'login';

    // Route changed externally (e.g. via location.hash) — let Router handle it
    if (currentRoute !== _lastRenderedRoute) {
      _lastRenderedRoute = currentRoute;
      Router.render();
      window.scrollTo(0, 0);
      return;
    }

    // Same route — preserve focus + scroll, re-render in place
    const active = document.activeElement;
    const focusId = active?.id || null;
    const selStart = active?.selectionStart ?? null;
    const selEnd = active?.selectionEnd ?? null;
    const scrollY = window.scrollY;

    Router.render();

    if (focusId) {
      const el = document.getElementById(focusId);
      if (el && typeof el.focus === 'function') {
        try {
          el.focus();
          if (selStart != null && typeof el.setSelectionRange === 'function') {
            el.setSelectionRange(selStart, selEnd);
          }
        } catch (_) { /* some input types don't support setSelectionRange */ }
      }
    }

    window.scrollTo(0, scrollY);
  });

  /* ---------- 7. Route init ---------- */
  Router.init();
  _lastRenderedRoute = Router.parseHash().name || 'login';

  /* ---------- 8. React to session changes (login/logout) ---------- */
  let _lastUserId = session?.userId || null;
  Store.subscribe(async state => {
    const currentId = state.session?.userId || null;
    if (currentId !== _lastUserId) {
      _lastUserId = currentId;
      if (currentId) {
        await loadUserScopedSettings(currentId);
      } else {
        Store.setSilent({
          prefs: defaultPrefs(),
          notifications: defaultNotifications(),
        });
      }
      applyPrefsToDOM(Store.get().prefs);
      // Session change → force route based on new role
      const role = state.session?.role;
      if (role) {
        Router.go('dashboard');
      } else {
        Router.go('login');
      }
    }
  });

  Store.setSilent({ ready: true, bootedAt: Utils.nowISO() });
  applyPrefsToDOM(Store.get().prefs);
  console.log('  ✓ Ready');
})();

/* ============================================================
   Per-user settings loader
   ============================================================ */
async function loadUserScopedSettings(userId) {
  if (!userId) return;

  const prefs = await DB.getPrefs(userId);
  if (prefs) {
    Store.setSilent({ prefs: { ...defaultPrefs(), ...prefs } });
  } else {
    Store.setSilent({ prefs: defaultPrefs() });
  }

  const notifications = await DB.getNotifications(userId);
  if (notifications) {
    Store.setSilent({ notifications: { ...defaultNotifications(), ...notifications } });
  } else {
    Store.setSilent({ notifications: defaultNotifications() });
  }

  applyPrefsToDOM(Store.get().prefs);
}

function defaultPrefs() {
  return {
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
  };
}

function defaultNotifications() {
  return {
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
  };
}

/* ============================================================
   PREFS → DOM
   ============================================================ */
const ACCENTS = {
  blue:   '#2f8fa6',
  green:  '#23835c',
  purple: '#805bb5',
  orange: '#d8812e',
  pink:   '#d46f9b',
  teal:   '#2f9e9a',
};

function applyPrefsToDOM(prefs) {
  const html = document.documentElement;
  const theme = prefs.theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : prefs.theme;

  html.dataset.theme    = theme;
  html.dataset.amoled   = (theme === 'dark' && prefs.amoled) ? 'true' : 'false';
  html.dataset.compact  = prefs.compact  ? 'true' : 'false';
  html.dataset.contrast = prefs.contrast ? 'true' : 'false';
  html.dataset.font     = prefs.font || 'medium';
  html.dataset.performance = prefs.performance ? 'true' : 'false';

  const accent = ACCENTS[prefs.accent] || ACCENTS.blue;
  html.style.setProperty('--accent', accent);
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const p = Store.get().prefs;
  if (p.theme === 'system') applyPrefsToDOM(p);
});