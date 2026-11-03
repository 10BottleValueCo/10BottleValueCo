/* Local proof: retain Woo's form, validation, hooks and native session. */
(() => {
  const setup = () => {
    document.querySelectorAll('.woocommerce-cart-form .quantity').forEach((wrap) => {
      const input = wrap.querySelector('input.qty');
      if (!input || wrap.querySelector('.tbv-qty-control')) return;
      for (const [label, delta] of [['Decrease quantity', -1], ['Increase quantity', 1]]) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'tbv-qty-control';
        button.setAttribute('aria-label', label); button.textContent = delta < 0 ? '−' : '+';
        button.addEventListener('click', () => {
          const current = Number(input.value), min = Math.max(1, Number(input.min) || 1);
          const max = Math.min(20, Number(input.max) || 20);
          const next = Math.max(min, Math.min(max, (Number.isFinite(current) ? current : min) + delta));
          if (next === current) return;
          input.value = String(next);
          input.dispatchEvent(new Event('input', {bubbles:true}));
          input.dispatchEvent(new Event('change', {bubbles:true}));
          const submit = input.closest('form')?.querySelector('button[name="update_cart"]');
          if (submit && !submit.disabled) submit.click();
        });
        if (delta < 0) input.before(button); else input.after(button);
      }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
  if (window.jQuery) window.jQuery(document.body).on('updated_wc_div', setup);
})();
