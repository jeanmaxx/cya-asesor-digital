(() => {
  const root = document.documentElement;
  const saved = localStorage.getItem('ttd-admin-theme') || localStorage.getItem('cya-admin-theme');
  const toggles = () => document.querySelectorAll('[data-ttd-theme-toggle], #admin-theme-toggle');
  const apply = (value, persist = false) => {
    const theme = value === 'light' ? 'light' : 'dark';
    root.dataset.theme = theme;
    if (persist) {
      localStorage.setItem('ttd-admin-theme', theme);
      localStorage.setItem('cya-admin-theme', theme);
    }
    toggles().forEach(btn => {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
      btn.setAttribute('title', theme === 'dark' ? 'Tema claro' : 'Tema oscuro');
      const icon = btn.querySelector('span') || document.getElementById('admin-theme-icon');
      if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#07111D' : '#F5F8FB');
  };
  // TTD Admin abre en oscuro por defecto; una elección explícita del usuario siempre se respeta.
  apply(saved || 'dark');
  window.addEventListener('DOMContentLoaded', () => {
    toggles().forEach(btn => {
      if (btn.dataset.ttdThemeBound === '1') return;
      btn.dataset.ttdThemeBound = '1';
      btn.addEventListener('click', () => apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
    });
    const sidebar = document.querySelector('.ttd-sidebar');
    document.querySelectorAll('[data-ttd-sidebar-toggle]').forEach(btn => btn.addEventListener('click', () => sidebar?.classList.toggle('is-open')));
    document.querySelectorAll('.ttd-nav-link').forEach(link => link.addEventListener('click', () => sidebar?.classList.remove('is-open')));
  });
})();
