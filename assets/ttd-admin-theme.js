(() => {
  const root = document.documentElement;
  const saved = localStorage.getItem('ttd-admin-theme') || localStorage.getItem('cya-admin-theme');

  if (!document.querySelector('link[data-ttd-fixed-shell]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/assets/ttd-admin-fixed-shell.css?v=20260917-unified3';
    link.dataset.ttdFixedShell = '1';
    document.head.appendChild(link);
  }

  const allToggles = () => document.querySelectorAll('[data-ttd-theme-toggle], #admin-theme-toggle');
  const apply = (value, persist = false) => {
    const theme = value === 'light' ? 'light' : 'dark';
    root.dataset.theme = theme;
    if (persist) {
      localStorage.setItem('ttd-admin-theme', theme);
      localStorage.setItem('cya-admin-theme', theme);
    }
    allToggles().forEach(btn => {
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
    if (p.includes('/otros') || p.includes('otro-negocio') || p.includes('otro-editor')) return 'otros';
    return 'admin';
  };

  function logoMarkup() {
    return `<span class="ttd-shell-mark" aria-label="TTD"><img src="data:image/png;base64,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" alt="TTD" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="ttd-shell-mark-fallback">TTD</span></span>`;
  }

  function buildLegacyShell() {
    if (!document.body.classList.contains('ttd-legacy-shell')) return;
    const banner = document.querySelector('.ttd-context-banner');
    if (!banner || banner.dataset.fixedShell === '1') return;
    banner.dataset.fixedShell = '1';
    banner.classList.add('ttd-shell-header');

    const actions = document.querySelector('.admin-header-actions');
    const moved = actions ? [...actions.children] : [];
    banner.innerHTML = `<div class="ttd-shell-brand">${logoMarkup()}<div class="ttd-shell-brand-copy"><small>PANEL DE ADMINISTRACIÓN DE</small><strong>Tu Tarjeta Digital</strong></div></div><div class="ttd-shell-actions"><div class="ttd-shell-alva"><span>Una solución de</span><img class="alva-mark" src="/assets/alva-isotipo.svg" alt=""><img class="alva-word" src="/assets/alva-logotipo.svg" alt="ALVA"><span>Soluciones Digitales</span></div></div>`;
    const host = banner.querySelector('.ttd-shell-actions');
    moved.forEach(node => host.appendChild(node));

    document.querySelectorAll('.ttd-global-tabs').forEach(n => n.remove());
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

  if (!saved) localStorage.setItem('ttd-admin-theme', 'dark');
  apply(saved || 'dark');

  const boot = () => {
    buildLegacyShell();
    document.querySelectorAll('[data-ttd-theme-toggle]').forEach(btn => {
      if (btn.dataset.ttdThemeBound === '1') return;
      btn.dataset.ttdThemeBound = '1';
      btn.addEventListener('click', () => apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true));
    });
    apply(root.dataset.theme);
    const sidebar = document.querySelector('.ttd-sidebar');
    document.querySelectorAll('[data-ttd-sidebar-toggle]').forEach(btn => btn.addEventListener('click', () => sidebar?.classList.toggle('is-open')));
    document.querySelectorAll('.ttd-nav-link').forEach(link => link.addEventListener('click', () => sidebar?.classList.remove('is-open')));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true }); else boot();
})();
