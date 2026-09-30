/* ============================================================
   ALISHAN · TOAST
   Transient status messages (bottom-right).
   ============================================================ */

const Toast = (() => {
  const root = () => document.getElementById('toast-root');
  const MAX = 4;

  function show(message, opts = {}) {
    const { type = 'info', duration = 2600 } = opts;
    const r = root();
    if (!r) return;

    while (r.children.length >= MAX) r.removeChild(r.firstChild);

    const node = document.createElement('div');
    node.className = 'toast' + (type !== 'info' ? ' ' + type : '');
    node.textContent = message;
    r.appendChild(node);

    setTimeout(() => {
      node.style.transition = 'opacity 220ms, transform 220ms';
      node.style.opacity = '0';
      node.style.transform = 'translateY(6px)';
      setTimeout(() => node.remove(), 240);
    }, duration);
  }

  const success = (m, o = {}) => show(m, { ...o, type: 'success' });
  const error   = (m, o = {}) => show(m, { ...o, type: 'error' });
  const warning = (m, o = {}) => show(m, { ...o, type: 'warning' });

  return { show, success, error, warning };
})();

window.Toast = Toast;