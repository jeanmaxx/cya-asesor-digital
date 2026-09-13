(() => {
  const apply = () => {
    const el = document.getElementById('ally-label');
    if (!el) return;
    const raw = String(el.textContent || '');
    if (raw.includes('|')) {
      const formatted = raw.split('|').map(x => x.trim()).filter(Boolean).join('\n');
      if (formatted !== raw) el.textContent = formatted;
    }
    el.classList.toggle('is-multiline', String(el.textContent || '').includes('\n'));
  };

  const start = () => {
    const el = document.getElementById('ally-label');
    if (!el) return;
    apply();
    new MutationObserver(apply).observe(el, { childList: true, characterData: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
