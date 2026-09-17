(() => {
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const saved = localStorage.getItem('ttd-admin-theme') || localStorage.getItem('cya-admin-theme');
  const apply = (value, persist = false) => {
    const theme = value === 'dark' ? 'dark' : 'light';
    root.dataset.theme = theme;
    if (persist) {
      localStorage.setItem('ttd-admin-theme', theme);
      localStorage.setItem('cya-admin-theme', theme);
    }
    document.querySelectorAll('[data-ttd-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
      btn.setAttribute('title', theme === 'dark' ? 'Tema claro' : 'Tema oscuro');
      const icon = btn.querySelector('span');
      if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#07111D' : '#F5F8FB');
  };
  apply(saved || (media.matches ? 'dark' : 'light'));
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-ttd-theme-toggle]').forEach(btn => {
      btn.addEventListener('click', () => apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
    });
    const sidebar = document.querySelector('.ttd-sidebar');
    document.querySelectorAll('[data-ttd-sidebar-toggle]').forEach(btn => btn.addEventListener('click', () => sidebar?.classList.toggle('is-open')));
    document.querySelectorAll('.ttd-nav-link').forEach(link => link.addEventListener('click', () => sidebar?.classList.remove('is-open')));
  });
  media.addEventListener?.('change', e => {
    if (!localStorage.getItem('ttd-admin-theme') && !localStorage.getItem('cya-admin-theme')) apply(e.matches ? 'dark' : 'light');
  });
})();
