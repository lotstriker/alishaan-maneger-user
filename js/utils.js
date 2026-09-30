/* ============================================================
   ALISHAN · UTILS
   Pure helper functions. No state, no side effects.
   ============================================================ */

const Utils = (() => {

  /* ---------- DOM ---------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class')      node.className = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function')
        node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html')  node.innerHTML = v;
      else if (k === 'text')  node.textContent = v;
      else node.setAttribute(k, v);
    }
    const list = Array.isArray(children) ? children : [children];
    for (const c of list) {
      if (c == null || c === false) continue;
      node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  /* ---------- Escape ---------- */
  const ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  function esc(v) {
    if (v == null) return '';
    return String(v).replace(/[&<>"']/g, c => ESC_MAP[c]);
  }

  /* ---------- Money ---------- */
  function money(n, opts = {}) {
    const num = Number(n) || 0;
    const decimals = opts.decimals ?? (Number.isInteger(num) ? 0 : 2);
    return '₹' + num.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function dozen(n) {
    return (Number(n) || 0).toFixed(2);
  }

  /* ---------- Dates ---------- */
  const todayISO = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  function nowISO() { return new Date().toISOString(); }

  function fmtDate(iso, opts = {}) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', ...opts,
    });
  }

  function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function ago(iso) {
    if (!iso) return '—';
    const d = new Date(iso).getTime();
    if (isNaN(d)) return '—';
    const diff = Date.now() - d;
    if (diff < 0) return 'just now';
    const s = Math.floor(diff / 1000);
    if (s < 60)   return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60)   return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24)   return h + 'h ago';
    const days = Math.floor(h / 24);
    if (days < 30) return days + 'd ago';
    const mo = Math.floor(days / 30);
    if (mo < 12)  return mo + 'mo ago';
    return Math.floor(mo / 12) + 'y ago';
  }

  function daysBetween(a, b = Date.now()) {
    const t = (typeof a === 'string') ? new Date(a).getTime() : a;
    return Math.floor((b - t) / 86400000);
  }

  /* ---------- ID helpers ---------- */
  function uid(prefix = 'ID') {
    return prefix + '-' + Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2, 7);
  }

  function seqId(prefix, existingIds) {
    const nums = existingIds
      .map(id => Number(String(id).replace(/\D/g, '')))
      .filter(n => !isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    return prefix + String(max + 1).padStart(5, '0');
  }

  /* ---------- Async helpers ---------- */
  function debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function throttle(fn, wait = 200) {
    let last = 0, timer;
    return (...args) => {
      const now = Date.now();
      const remaining = wait - (now - last);
      if (remaining <= 0) {
        last = now;
        fn(...args);
      } else if (!timer) {
        timer = setTimeout(() => { last = Date.now(); timer = null; fn(...args); }, remaining);
      }
    };
  }

  function deepClone(obj) {
    if (obj == null || typeof obj !== 'object') return obj;
    if (typeof structuredClone === 'function') {
      try { return structuredClone(obj); } catch (_) {}
    }
    return JSON.parse(JSON.stringify(obj));
  }

  /* ---------- Misc ---------- */
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function initials(name = '') {
    return name.trim().split(/\s+/).slice(0, 2)
      .map(w => w[0]).join('').toUpperCase() || '?';
  }

  function normalize(s) {
    return String(s || '').trim().toLowerCase();
  }

  function formatRange(a, b) {
    const d1 = new Date(a), d2 = new Date(b);
    const sameMonth = d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    const day = d => d.getDate();
    const mon = d => d.toLocaleDateString('en-IN', { month: 'short' });
    return sameMonth
      ? `${day(d1)}–${day(d2)} ${mon(d2)}`
      : `${day(d1)} ${mon(d1)} – ${day(d2)} ${mon(d2)}`;
  }

  return {
    $, $$, el, esc, money, dozen,
    todayISO, nowISO, fmtDate, fmtDateTime, ago, daysBetween,
    uid, seqId, debounce, throttle, deepClone,
    getGreeting, initials, normalize, formatRange,
  };
})();

window.Utils = Utils;