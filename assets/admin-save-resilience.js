(() => {
  const originalFetch = window.fetch.bind(window);
  const supabaseHost = String(window.SUPABASE_CONFIG?.url || '').replace(/^https?:\/\//, '');
  let backupWarning = false;

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const getUrl = (input) => typeof input === 'string' ? input : (input?.url || '');
  const fakeOk = () => new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } });

  window.fetch = async (input, init) => {
    const url = getUrl(input);
    const isSupabase = !!supabaseHost && url.includes(supabaseHost);
    const isBackup = /\/rest\/v1\/rpc\/create_platform_backup(?:\?|$)/.test(url);

    const run = async () => {
      const response = await originalFetch(input, init);
      if (isBackup && !response.ok) {
        backupWarning = true;
        console.warn('El respaldo automático falló, pero el guardado principal continuará.');
        return fakeOk();
      }
      return response;
    };

    try {
      return await run();
    } catch (error) {
      if (!isSupabase) throw error;
      await sleep(450);
      try {
        return await run();
      } catch (retryError) {
        if (isBackup) {
          backupWarning = true;
          console.warn('No fue posible crear el respaldo automático después del reintento.', retryError);
          return fakeOk();
        }
        throw retryError;
      }
    }
  };

  const watchMessages = () => {
    const candidates = ['save-message', 'business-save-message', 'other-save-message'];
    candidates.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new MutationObserver(() => {
        if (!backupWarning) return;
        const text = String(el.textContent || '');
        if (el.classList.contains('is-success') && /guardad/i.test(text)) {
          el.textContent = 'Cambios guardados. El respaldo automático no pudo completarse; puedes crear uno manual más tarde.';
          el.classList.remove('is-success');
          el.style.color = '#b47219';
          backupWarning = false;
        }
      });
      observer.observe(el, { childList: true, characterData: true, subtree: true, attributes: true });
    });
  };

  const boot = () => watchMessages();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
