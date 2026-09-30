/* ============================================================
   ALISHAN · MODAL
   Simple confirmation / form modal.

   PHASE 1 FIX (P0-02):
   - onConfirm is now awaited, so async validators work.
   - Modal stays open if onConfirm returns false or throws.
   - Loading state during async confirm.
   - Double-click protection.
   ============================================================ */

const Modal = (() => {
  let _active = null;

  function open({ title, text = '', body = '', confirmLabel = 'Confirm',
                  cancelLabel = 'Cancel', danger = false,
                  onConfirm = null, onCancel = null }) {
    close();

    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${Utils.esc(title)}</h3>
        ${text ? `<p class="muted" style="font-size:.88rem;line-height:1.55;">${Utils.esc(text)}</p>` : ''}
        ${body ? `<div style="margin-top:14px;">${body}</div>` : ''}
        <div class="modal-actions">
          ${cancelLabel ? `<button class="btn" data-modal-cancel>${Utils.esc(cancelLabel)}</button>` : ''}
          <button class="btn ${danger ? 'danger' : 'primary'}" data-modal-confirm>
            ${Utils.esc(confirmLabel)}
          </button>
        </div>
      </div>
    `;

    wrap.addEventListener('click', e => {
      if (e.target === wrap) {
        close();
        onCancel && onCancel();
      }
    });

    const cancelBtn = wrap.querySelector('[data-modal-cancel]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        close();
        onCancel && onCancel();
      });
    }

    /* PHASE 1 FIX — await async onConfirm */
    const confirmBtn = wrap.querySelector('[data-modal-confirm]');
    const originalLabel = confirmBtn.textContent;

    confirmBtn.addEventListener('click', async () => {
      if (confirmBtn.disabled) return;             // double-click guard
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Saving…';

      try {
        const ok = onConfirm ? await onConfirm(wrap.querySelector('.modal')) : true;
        if (ok !== false) {
          close();
        } else {
          // Validation failed — keep modal open, restore button
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalLabel;
        }
      } catch (e) {
        console.error('[modal] onConfirm error', e);
        if (window.Toast) Toast.error('Something went wrong.');
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalLabel;
      }
    });

    const escHandler = e => {
      if (e.key === 'Escape') { close(); onCancel && onCancel(); }
    };
    document.addEventListener('keydown', escHandler);

    root.appendChild(wrap);
    _active = { wrap, escHandler };

    const firstInput = wrap.querySelector('input,textarea,select');
    if (firstInput) setTimeout(() => firstInput.focus(), 60);
    else setTimeout(() => confirmBtn.focus(), 60);
  }

  function close() {
    const root = document.getElementById('modal-root');
    root.innerHTML = '';
    if (_active?.escHandler) document.removeEventListener('keydown', _active.escHandler);
    _active = null;
  }

  function confirm({ title, text, confirmLabel = 'Confirm', danger = false }) {
    return new Promise(resolve => {
      open({
        title, text,
        confirmLabel,
        danger,
        onConfirm: () => resolve(true),
        onCancel:  () => resolve(false),
      });
    });
  }

  return { open, close, confirm };
})();

window.Modal = Modal;