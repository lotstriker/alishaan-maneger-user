/* ============================================================
   ALISHAN · AUTH
   Login, session persistence, logout, password hashing,
   AND internal Manager-role authorization.
   ============================================================ */

const Auth = (() => {
  const SESSION_KEY = 'alishan.session.v1';

  /* ---------- Password hashing (SHA-256, hex) ---------- */
  async function hashPassword(plain) {
    const enc = new TextEncoder().encode('alishan::' + plain);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function verifyPassword(plain, hash) {
    const h = await hashPassword(plain);
    if (h.length !== hash.length) return false;
    let diff = 0;
    for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ hash.charCodeAt(i);
    return diff === 0;
  }

  /* ---------- Session persistence ---------- */
  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s?.userId || !s?.role) return null;
      return s;
    } catch { return null; }
  }

  function saveSession(session) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }

  /* ---------- Manager verification (P0-07 fix) ---------- */
  async function verifyManager(actorId) {
    if (!actorId) return { ok: false, error: 'No actor provided.' };
    const actor = await DB.get('users', actorId);
    if (!actor) return { ok: false, error: 'Actor not found.' };
    if (actor.role !== 'Manager') return { ok: false, error: 'Only Managers can perform this action.' };
    if (actor.status === 'inactive') return { ok: false, error: 'Your account is deactivated.' };
    return { ok: true, actor };
  }

  /* ---------- Login ---------- */
  async function login(phone, password) {
    phone = String(phone || '').replace(/\s+/g, '').trim();
    password = String(password || '');

    if (!phone)    return { ok: false, error: 'Phone number required.' };
    if (!password) return { ok: false, error: 'Password required.' };

    const users = await DB.getAll('users');
    const user = users.find(u => String(u.phone) === phone);

    if (!user)                      return { ok: false, error: 'Account not found.' };
    if (user.status === 'inactive') return { ok: false, error: 'This account has been deactivated. Contact your Manager.' };

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return { ok: false, error: 'Incorrect password.' };

    user.lastLogin = Utils.nowISO();
    await DB.put('users', user);

    await logAudit(user.id, user.name, 'LOGIN', `Logged in from ${phone}`);

    const session = {
      userId: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      since: Utils.nowISO(),
    };
    saveSession(session);
    return { ok: true, session };
  }

  /* ---------- Logout ---------- */
  async function logout() {
    const s = loadSession();
    if (s) await logAudit(s.userId, s.name, 'LOGOUT', 'Logged out');
    clearSession();
  }

  /* ---------- Restore session ---------- */
  async function restoreSession() {
    const s = loadSession();
    if (!s) return null;
    const user = await DB.get('users', s.userId);
    if (!user || user.status === 'inactive') {
      clearSession();
      return null;
    }
    const fresh = { ...s, name: user.name, role: user.role, phone: user.phone };
    saveSession(fresh);
    return fresh;
  }

  /* ---------- Create user (Manager only) ---------- */
  async function createUser({ name, phone, role, password, createdBy }) {
    const auth = await verifyManager(createdBy);
    if (!auth.ok) return auth;

    name = String(name || '').trim();
    phone = String(phone || '').replace(/\s+/g, '').trim();
    role = role === 'Manager' ? 'Manager' : 'User';

    if (!name)                       return { ok: false, error: 'Name required.' };
    if (!/^\d{10}$/.test(phone))     return { ok: false, error: 'Phone must be 10 digits.' };
    if (String(password).length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

    const users = await DB.getAll('users');
    if (users.some(u => String(u.phone) === phone))
      return { ok: false, error: 'Phone number already registered.' };

    const id = Utils.uid('U');
    const passwordHash = await hashPassword(password);
    const user = {
      id, name, phone, role, passwordHash,
      status: 'active',
      createdBy,
      createdAt: Utils.nowISO(),
      lastLogin: null,
    };
    await DB.put('users', user);
    await logAudit(createdBy, auth.actor.name, 'USER_CREATED',
      `Created ${role} "${name}" (${phone})`);
    return { ok: true, user };
  }

  /* ---------- Change own password ---------- */
  async function changePassword(userId, currentPlain, newPlain, confirmPlain) {
    if (!userId) return { ok: false, error: 'Not logged in.' };
    if (String(newPlain).length < 6) return { ok: false, error: 'New password must be at least 6 characters.' };
    if (newPlain !== confirmPlain)   return { ok: false, error: 'New password and confirmation do not match.' };

    const user = await DB.get('users', userId);
    if (!user) return { ok: false, error: 'Account not found.' };

    const ok = await verifyPassword(currentPlain, user.passwordHash);
    if (!ok) return { ok: false, error: 'Current password is incorrect.' };

    user.passwordHash = await hashPassword(newPlain);
    user.passwordChangedAt = Utils.nowISO();
    await DB.put('users', user);
    await logAudit(userId, user.name, 'PASSWORD_CHANGED', 'Password changed');
    return { ok: true };
  }

  /* ---------- Manager: reset a user's password ---------- */
  async function resetPassword(managerId, managerName, targetUserId, newPlain) {
    const auth = await verifyManager(managerId);
    if (!auth.ok) return auth;

    if (String(newPlain).length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    const user = await DB.get('users', targetUserId);
    if (!user) return { ok: false, error: 'User not found.' };
    user.passwordHash = await hashPassword(newPlain);
    user.passwordChangedAt = Utils.nowISO();
    await DB.put('users', user);
    await logAudit(managerId, auth.actor.name, 'PASSWORD_RESET',
      `Reset password for "${user.name}" (${user.phone})`);
    return { ok: true };
  }

  /* ---------- Manager: activate / deactivate ---------- */
  async function setUserStatus(managerId, managerName, targetUserId, status) {
    const auth = await verifyManager(managerId);
    if (!auth.ok) return auth;

    const user = await DB.get('users', targetUserId);
    if (!user) return { ok: false, error: 'User not found.' };
    if (user.id === managerId) return { ok: false, error: 'You cannot deactivate yourself.' };

    user.status = status === 'inactive' ? 'inactive' : 'active';
    await DB.put('users', user);
    await logAudit(managerId, auth.actor.name,
      user.status === 'active' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      `${user.status === 'active' ? 'Activated' : 'Deactivated'} "${user.name}" (${user.phone})`);
    return { ok: true, user };
  }

  /* ---------- Audit log helper ---------- */
  async function logAudit(userId, userName, action, detail = '') {
    try {
      await DB.put('auditLog', {
        id: Utils.uid('A'),
        at: Utils.nowISO(),
        userId, userName, action, detail,
      });
    } catch (e) { /* audit failure must never block the app */ }
  }

  return {
    hashPassword, verifyPassword, verifyManager,
    login, logout, restoreSession,
    createUser, changePassword, resetPassword, setUserStatus,
    logAudit,
  };
})();

window.Auth = Auth;