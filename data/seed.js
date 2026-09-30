/* ============================================================
   ALISHAN · SEED DATA
   First-run seeding. Runs only when users store is empty.

   Production:
     - Seeds ONLY the first Manager account.
     - Master Data starts empty (per blueprint File 19).
     - No demo users, no demo records, no demo masters.

   Demo mode (for testing):
     - Add ?demo=1 to URL to seed demo User, records, and master data.
   ============================================================ */

const Seed = (() => {

  const FIRST_MANAGER = {
    id: 'U-manager-01',
    name: 'Manager',
    phone: '9999999999',
    role: 'Manager',
    password: 'admin123',
  };

  const DEMO_USER = {
    id: 'U-user-01',
    name: 'Saif Ali',
    phone: '8888888888',
    role: 'User',
    password: 'user123',
  };

  const SIZES = [28,30,32,34,36,38,40,42,44,46,48,50];

  function isDemoMode() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('demo') === '1';
    } catch (_) { return false; }
  }

  function emptyQ() {
    const o = {};
    SIZES.forEach(s => o[s] = { dozens: 0, pieces: 0 });
    return o;
  }

  /* ---------- Always: seed first Manager ---------- */
  async function seedFirstManager() {
    const managerHash = await Auth.hashPassword(FIRST_MANAGER.password);
    await DB.put('users', {
      id: FIRST_MANAGER.id,
      name: FIRST_MANAGER.name,
      phone: FIRST_MANAGER.phone,
      role: FIRST_MANAGER.role,
      passwordHash: managerHash,
      status: 'active',
      createdBy: 'system',
      createdAt: Utils.nowISO(),
      lastLogin: null,
    });
    console.log('  ✓ Seeded first Manager (9999999999 / admin123)');
  }

  /* ---------- Always: seed global settings row ---------- */
  async function seedGlobalSettings() {
    await DB.put('settings', {
      key: 'global',
      value: { trackingPeriod: 'weekly', twoFAEnforced: false },
    });
  }

  /* ---------- Demo-only seed ---------- */
  async function seedDemoData() {
    console.log('  · Demo mode active — seeding demo data');

    /* Demo user */
    const userHash = await Auth.hashPassword(DEMO_USER.password);
    await DB.put('users', {
      id: DEMO_USER.id,
      name: DEMO_USER.name,
      phone: DEMO_USER.phone,
      role: DEMO_USER.role,
      passwordHash: userHash,
      status: 'active',
      createdBy: FIRST_MANAGER.id,
      createdAt: Utils.nowISO(),
      lastLogin: null,
    });

    /* Demo master data */
    const demoQualities = {
      Bra: [
        { name: 'BEAUTYBOX',   price: 25, active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
        { name: 'ROYAL LACE',  price: 32, active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
        { name: 'EVERYDAY',    price: 20, active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      ],
      Panty: [
        { name: 'ICE-PANTY',   price: 15, active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
        { name: 'SOFT COTTON', price: 18, active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      ],
      Set: [
        { name: 'COMFORT SET', price: 40, active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      ],
      Blouse: [
        { name: 'DAILY BLOUSE', price: 30, active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      ],
    };
    await DB.put('qualities', { id: 'master', value: demoQualities });

    const demoColors = [
      { name: 'Red',    hex: '#ef5350', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      { name: 'Black',  hex: '#202124', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      { name: 'White',  hex: '#f7f7f7', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      { name: 'Navy',   hex: '#223a70', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      { name: 'Pink',   hex: '#ec78a9', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      { name: 'Green',  hex: '#57a773', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      { name: 'Maroon', hex: '#7b2531', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      { name: 'Yellow', hex: '#e2b93b', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      { name: 'Peach',  hex: '#f5a477', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      { name: 'Purple', hex: '#8b5fbf', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      { name: 'Sky',    hex: '#68b9d3', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
      { name: 'Grey',   hex: '#8c969a', active: true, status: 'APPROVED', createdAt: Utils.nowISO() },
    ];
    await DB.put('colors', { id: 'master', value: demoColors });

    /* Demo records + payments */
    const now = Date.now();
    const iso = t => new Date(t).toISOString();
    const today = new Date().toISOString().slice(0, 10);

    const r1 = {
      id: 'Q-00001', ownerId: DEMO_USER.id, ownerName: DEMO_USER.name,
      type: 'Bra', quality: 'BEAUTYBOX', cup: 'C',
      priceSnapshot: 25, colors: ['Red', 'Black'], mode: 'same',
      quantities: (() => {
        const q = emptyQ();
        q[30] = { dozens: 8, pieces: 0 };
        q[32] = { dozens: 6, pieces: 6 };
        q[34] = { dozens: 2, pieces: 6 };
        q[36] = { dozens: 3, pieces: 6 };
        return q;
      })(),
      weight: 12, meter: 340, lot: '', maalGaya: '',
      notes: 'First demo entry',
      entryDate: today,
      createdAt: iso(now - 86400000), lastModified: iso(now - 86400000),
      status: 'INCOMPLETE', paymentTracked: true, history: [], archived: false,
    };

    const r2 = {
      id: 'Q-00002', ownerId: DEMO_USER.id, ownerName: DEMO_USER.name,
      type: 'Panty', quality: 'ICE-PANTY', cup: 'A',
      priceSnapshot: 15, colors: ['White', 'Pink'], mode: 'different',
      quantities: emptyQ(),
      quantitiesByColor: {
        White: (() => { const q = emptyQ(); q[32] = { dozens: 4, pieces: 0 }; q[34] = { dozens: 2, pieces: 6 }; return q; })(),
        Pink:  (() => { const q = emptyQ(); q[32] = { dozens: 3, pieces: 0 }; return q; })(),
      },
      weight: 8, meter: 210, lot: 'L-042', maalGaya: 'Nehru Market',
      notes: 'Ready for dispatch',
      entryDate: today,
      createdAt: iso(now - 12 * 86400000), lastModified: iso(now - 4 * 86400000),
      status: 'COMPLETED', paymentTracked: true, history: [], archived: false,
    };

    await DB.put('records', r1);
    await DB.put('records', r2);

    await DB.put('payments', {
      id: 'P-00001', recordId: 'Q-00002', amount: 100,
      date: today, method: 'UPI', note: 'Advance',
      createdBy: DEMO_USER.id, createdAt: iso(now),
      archived: false,
    });

    console.log('  ✓ Demo data seeded (User + records + masters)');
  }

  /* ---------- Run ---------- */
  async function run() {
    const count = await DB.count('users');
    if (count > 0) return false;

    console.log('  · First run — seeding');

    await seedFirstManager();
    await seedGlobalSettings();

    if (isDemoMode()) {
      await seedDemoData();
    } else {
      console.log('  · Demo data skipped (add ?demo=1 to URL to seed demo)');
    }

    return true;
  }

  return { run, isDemoMode };
})();

window.Seed = Seed;