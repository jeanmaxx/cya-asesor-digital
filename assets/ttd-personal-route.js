(() => {
  const basePath = '/admin/personales/';
  const cleanPath = location.pathname.replace(/\/+$/, '/') ;
  const raw = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : '';
  const slug = decodeURIComponent(raw.replace(/^\/+|\/+$/g,''));
  const list = document.getElementById('accounts-list');

  document.body.classList.add('ttd-legacy-shell');

  function cardSlug(card){ return card?.querySelector('code')?.textContent?.trim() || ''; }
  function openFromRoute(){
    if (!slug || !list) return false;
    const card = [...list.querySelectorAll('.account-card')].find(c => cardSlug(c) === slug);
    const button = card?.querySelector('.edit-account');
    if (!button) return false;
    button.click();
    document.title = `${card.querySelector('.account-card__identity strong')?.textContent || 'Tarjeta personal'} · TTD Admin`;
    return true;
  }

  list?.addEventListener('click', e => {
    const button = e.target.closest('.edit-account');
    if (!button) return;
    const card = button.closest('.account-card');
    const targetSlug = cardSlug(card);
    if (!targetSlug || targetSlug === slug) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    location.href = `${basePath}${encodeURIComponent(targetSlug)}`;
  }, true);

  ['back-to-accounts','cancel-edit'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (!slug) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      location.href = basePath;
    }, true);
  });

  if (slug && list) {
    if (!openFromRoute()) {
      const observer = new MutationObserver(() => { if (openFromRoute()) observer.disconnect(); });
      observer.observe(list, { childList:true });
      setTimeout(() => observer.disconnect(), 12000);
    }
  }
})();
