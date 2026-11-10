(() => {
  const basePath = '/admin/personales/';
  const raw = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : '';
  const initialSlug = decodeURIComponent(raw.replace(/^\/+|\/+$/g,''));
  const routeSlug = () => decodeURIComponent(location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length).replace(/^\/+|\/+$/g,'') : '');
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
    const slug = routeSlug();
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
    if (!targetSlug) return;
    // Keep the native editor click handler: navigating first used to cancel it.
    // Updating the URL without reloading also preserves the authenticated session.
    if (targetSlug !== routeSlug()) history.pushState({ttdEditor:targetSlug},'',`${basePath}${encodeURIComponent(targetSlug)}/`);
  }, true);

  ['back-to-accounts','cancel-edit'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (!routeSlug()) return;
      // Let admin-v2.js close the editor normally; only synchronize the URL.
      history.pushState({ttdEditor:null},'',basePath);
    }, true);
  });

  if (list) {
    normalizePublicLinks();
    const observer = new MutationObserver(() => { normalizePublicLinks(); if (initialSlug && openFromRoute()) observer.disconnect(); });
    observer.observe(list, { childList:true });
    if (initialSlug) {
      if (openFromRoute()) observer.disconnect();
      else setTimeout(() => observer.disconnect(), 12000);
    }
  }
  // Browser Back/Forward must restore the corresponding editor or list view.
  window.addEventListener('popstate', () => location.reload());
})();
