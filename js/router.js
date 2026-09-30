/* ============================================================
   ALISHAN · ROUTER
   Role-aware hash routing.

   PHASE 1 FIX (P0-01b):
   - Router.render() no longer depends on Store's scheduled render.
   - Router.go() directly calls render() after hash change.
   - Store render callback skips route changes (only handles same-route UI updates).
   - Prevents double render / infinite loop when navigating.
   ============================================================ */

const Router = (() => {

  const ROUTES = {
    login:         { page: () => LoginPage,           requiresAuth: false },
    dashboard:     { page: () => pageFor('dashboard'), requiresAuth: true },
    inventory:     { page: () => InventoryPage,       requiresAuth: true  },
    reports:       { page: () => ReportsPage,         requiresAuth: true  },
    settings:      { page: () => pageFor('settings'), requiresAuth: true  },
    notifications: { page: () => NotificationsPage,   requiresAuth: true  },
    backup:        { page: () => BackupPage,          requiresAuth: true  },
    archive:       { page: () => ArchivePage,         requiresAuth: true  },

    /* Manager-only */
    users:         { page: () => UsersPage,           requiresAuth: true, managerOnly: true },
    approvals:     { page: () => ApprovalsPage,       requiresAuth: true, managerOnly: true },
    auditLog:      { page: () => AuditLogPage,        requiresAuth: true, managerOnly: true },
  };

  function pageFor(name) {
    const s = Store.get();
    const isManager = s.session?.role === 'Manager';
    if (name === 'dashboard') return isManager ? ManagerDashboardPage : DashboardPage;
    if (name === 'settings')  return isManager ? ManagerSettingsPage  : SettingsPage;
    return DashboardPage;
  }

  function parseHash() {
    const raw = (location.hash || '#login').replace(/^#\/?/, '');
    const [name, ...rest] = raw.split('/');
    return { name: name || 'login', params: rest };
  }

  function go(name, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const hash = '#/' + name + (qs ? '?' + qs : '');
    if (location.hash === hash) {
      // Same hash — force render
      render();
    } else {
      location.hash = hash;
    }
  }

  function render() {
    const { name } = parseHash();
    const def = ROUTES[name] || ROUTES.login;
    const s = Store.get();
    const authed = !!s.session;

    if (def.requiresAuth && !authed) {
      location.hash = '#/login';
      return;
    }
    if (!def.requiresAuth && authed) {
      location.hash = '#/dashboard';
      return;
    }
    if (def.managerOnly && s.session?.role !== 'Manager') {
      location.hash = '#/dashboard';
      return;
    }

    const page = def.page();
    const root = document.getElementById('app-root');
    root.innerHTML = page.render();
    if (page.mount) page.mount(root);

    // Update Store route WITHOUT triggering a re-render
    // (scheduleRender guard: route change won't cause a render)
    if (s.route !== name) {
      // Use a silent setter to avoid double render
      Store.setSilent({ route: name });
    }

    window.scrollTo(0, 0);
  }

  function init() {
    window.addEventListener('hashchange', render);
    render();
  }

  return { go, init, render, parseHash };
})();

window.Router = Router;