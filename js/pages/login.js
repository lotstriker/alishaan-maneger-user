/* ============================================================
   ALISHAN · LOGIN PAGE
   Fixed Dark Premium style, role-agnostic entry.
   ============================================================ */

const LoginPage = (() => {

  function render() {
    return `
      <main class="login-shell">
        <form class="login-card" id="login-form" autocomplete="on" novalidate>
          <div class="login-brand">
            <div class="mark" aria-hidden="true">✂</div>
            <div>
              <div class="name">ALISHAN</div>
              <div class="sub">cutting &amp; inventory management</div>
            </div>
          </div>

          <h1>Welcome back</h1>
          <p class="intro">Apne account se login karein. Role automatically check hota hai.</p>

          <div id="login-error-slot"></div>

          <div class="login-field">
            <label for="login-phone">Phone number</label>
            <input id="login-phone" name="phone" type="tel"
                   inputmode="numeric" pattern="[0-9]*"
                   autocomplete="username"
                   placeholder="10-digit phone number"
                   maxlength="10" required />
          </div>

          <div class="login-field">
            <label for="login-password">Password</label>
            <input id="login-password" name="password" type="password"
                   autocomplete="current-password"
                   placeholder="Your password" required />
          </div>

          <button class="login-btn" type="submit" id="login-submit">Login</button>

          <p class="login-note">Password bhool gaye? Manager se poochho.</p>

          <div class="login-roles">
            <div class="role"><span class="icon">👤</span><span>User App</span></div>
            <div class="role"><span class="icon">🛡</span><span>Manager App</span></div>
          </div>

          ${Seed.isDemoMode() ? `
            <div class="login-demo">
              <strong>Demo access</strong><br />
              Manager: 9999999999 / admin123<br />
              User: 8888888888 / user123
            </div>
          ` : ''}
        </form>
      </main>
    `;
  }

  function mount(root) {
    const form  = Utils.$('#login-form', root);
    const phone = Utils.$('#login-phone', root);
    const pass  = Utils.$('#login-password', root);
    const btn   = Utils.$('#login-submit', root);
    const errSlot = Utils.$('#login-error-slot', root);

    phone.addEventListener('input', () => {
      phone.value = phone.value.replace(/\D/g, '').slice(0, 10);
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      errSlot.innerHTML = '';
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = 'Signing in…';

      try {
        const result = await Auth.login(phone.value, pass.value);
        if (!result.ok) {
          errSlot.innerHTML = `<div class="login-error">⚠ ${Utils.esc(result.error)}</div>`;
          btn.disabled = false;
          btn.textContent = original;
          pass.focus();
          pass.select();
          return;
        }
        Toast.success(`Welcome, ${result.session.name.split(' ')[0]}`);
        Store.set({ session: result.session });
        window.Router.go('dashboard');
      } catch (err) {
        console.error(err);
        errSlot.innerHTML = `<div class="login-error">⚠ Something went wrong. Please try again.</div>`;
        btn.disabled = false;
        btn.textContent = original;
      }
    });

    setTimeout(() => phone.focus(), 60);
  }

  return { render, mount };
})();

window.LoginPage = LoginPage;