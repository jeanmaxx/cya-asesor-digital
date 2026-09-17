(() => {
  const basePath = '/admin/personales/';
  const raw = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : '';
  const slug = decodeURIComponent(raw.replace(/^\/+|\/+$/g,''));
  const list = document.getElementById('accounts-list');

  document.body.classList.add('ttd-legacy-shell');

  function cardSlug(card){ return card?.querySelector('code')?.textContent?.trim() || ''; }
  function normalizePublicLinks(){
    list?.querySelectorAll('.account-card').forEach(card => {
      const targetSlug = cardSlug(card);
      const view = card.querySelector('.secondary-link');
      if (targetSlug && view) view.href = `/asesores/?asesor=${encodeURIComponent(targetSlug)}`;
    });
  }
  function openFromRoute(){
    if (!slug || !list) return false;
    const card = [...list.querySelectorAll('.account-card')].find(c => cardSlug(c) === slug);
    const button = card?.querySelector('.edit-account');
    if (!button) return false;
    button.click();
    document.title = `${card.querySelector('.account-card__identity strong')?.textContent || 'Tarjeta personal'} · TTD Admin`;
    const preview = document.getElementById('profile-preview-link');
    if (preview) preview.href = `/asesores/?asesor=${encodeURIComponent(slug)}`;
    return true;
  }

  list?.addEventListener('click', e => {
    const button = e.target.closest('.edit-account');
    if (!button) return;
    const card = button.closest('.account-card');
    const targetSlug = cardSlug(card);
    if (!targetSlug || targetSlug === slug) return;
    e.preventDefault(); e.stopImmediatePropagation();
    location.href = `${basePath}${encodeURIComponent(targetSlug)}`;
  }, true);

  ['back-to-accounts','cancel-edit'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (!slug) return;
      e.preventDefault(); e.stopImmediatePropagation();
      location.href = basePath;
    }, true);
  });

  if (list) {
    normalizePublicLinks();
    const observer = new MutationObserver(() => { normalizePublicLinks(); if (slug && openFromRoute()) observer.disconnect(); });
    observer.observe(list, { childList:true });
    if (slug) {
      if (openFromRoute()) observer.disconnect();
      else setTimeout(() => observer.disconnect(), 12000);
    }
  }
})();
