(() => {
  const root = document.documentElement;
  const saved = localStorage.getItem('ttd-admin-theme') || localStorage.getItem('cya-admin-theme');

  // Capa visual compartida del shell administrativo TTD.
  if (!document.querySelector('link[data-ttd-fixed-shell]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/ttd-admin-fixed-shell.css?v=20260917-shell1';
    link.dataset.ttdFixedShell = '1';
    document.head.appendChild(link);
  }

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

  const activeKey = () => {
    const p = location.pathname.toLowerCase();
    if (p.includes('/personales')) return 'personales';
    if (p.includes('/barberias') || p.includes('barberia-editor')) return 'barberias';
    if (p.includes('/otros') || p.includes('otro-negocio')) return 'otros';
    return 'admin';
  };

  function buildLegacyShell() {
    if (!document.body.classList.contains('ttd-legacy-shell')) return;
    const banner = document.querySelector('.ttd-context-banner');
    if (!banner || banner.dataset.fixedShell === '1') return;
    banner.dataset.fixedShell = '1';
    banner.classList.add('ttd-shell-header');

    const actions = document.querySelector('.admin-header-actions');
    const moved = actions ? [...actions.children] : [];
    banner.innerHTML = `<div class="ttd-shell-brand"><img src="/assets/favicon-ttd.png" alt="TTD"><div class="ttd-shell-brand-copy"><small>PANEL DE ADMINISTRACIÓN DE</small><strong>Tu Tarjeta Digital</strong></div></div><div class="ttd-shell-actions"><div class="ttd-shell-alva"><span>Una solución de</span><img class="alva-mark" src="/assets/alva-isotipo.svg" alt=""><img class="alva-word" src="/assets/alva-logotipo.svg" alt="ALVA"><span>Soluciones Digitales</span></div></div>`;
    const host = banner.querySelector('.ttd-shell-actions');
    moved.forEach(node => host.appendChild(node));

    const navItems = [
      ['admin','ADMINISTRACIÓN','/admin/'],
      ['personales','TARJETAS PERSONALES','/admin/personales/'],
      ['barberias','BARBERÍAS','/admin/barberias/'],
      ['otros','OTROS NEGOCIOS','/admin/otros/']
    ];
    const active = activeKey();
    const nav = document.createElement('nav');
    nav.className = 'ttd-global-tabs';
    nav.setAttribute('aria-label','Navegación principal de TTD Admin');
    nav.innerHTML = navItems.map(([key,label,href]) => `<a class="ttd-global-tab${key===active?' is-active':''}" href="${href}">${label}</a>`).join('');
    banner.insertAdjacentElement('afterend',nav);
    document.querySelectorAll('.product-tabs').forEach(el => el.setAttribute('aria-hidden','true'));
  }

  // TTD Admin abre en oscuro por defecto; una elección explícita del usuario siempre se respeta.
  apply(saved || 'dark');

  window.addEventListener('DOMContentLoaded', () => {
    buildLegacyShell();
    toggles().forEach(btn => {
      if (btn.dataset.ttdThemeBound === '1') return;
      btn.dataset.ttdThemeBound = '1';
      btn.addEventListener('click', () => apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
    });
    apply(root.dataset.theme);
    const sidebar = document.querySelector('.ttd-sidebar');
    document.querySelectorAll('[data-ttd-sidebar-toggle]').forEach(btn => btn.addEventListener('click', () => sidebar?.classList.toggle('is-open')));
    document.querySelectorAll('.ttd-nav-link').forEach(link => link.addEventListener('click', () => sidebar?.classList.remove('is-open')));
  });
})();
