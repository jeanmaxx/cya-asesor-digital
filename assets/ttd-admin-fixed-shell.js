(() => {
  const activeKey = () => {
    const p = location.pathname.toLowerCase();
    if (p.includes('/personales')) return 'personales';
    if (p.includes('/barberias') || p.includes('barberia-editor')) return 'barberias';
    if (p.includes('/otros') || p.includes('otro-negocio')) return 'otros';
    return 'admin';
  };
  const navItems = [
    ['admin','ADMINISTRACIÓN','/admin/'],
    ['personales','TARJETAS PERSONALES','/admin/personales/'],
    ['barberias','BARBERÍAS','/admin/barberias/'],
    ['otros','OTROS NEGOCIOS','/admin/otros/']
  ];
  function build(){
    if(!document.body.classList.contains('ttd-legacy-shell')) return;
    const banner=document.querySelector('.ttd-context-banner');
    if(!banner || banner.dataset.fixedShell==='1') return;
    banner.dataset.fixedShell='1';
    banner.classList.add('ttd-shell-header');

    const actions=document.querySelector('.admin-header-actions');
    const moved=[];
    if(actions) [...actions.children].forEach(n=>moved.push(n));

    banner.innerHTML=`<div class="ttd-shell-brand"><img src="/assets/favicon-ttd.png" alt="TTD"><div class="ttd-shell-brand-copy"><small>PANEL DE ADMINISTRACIÓN DE</small><strong>Tu Tarjeta Digital</strong></div></div><div class="ttd-shell-actions"><div class="ttd-shell-alva"><span>Una solución de</span><img class="alva-mark" src="/assets/alva-isotipo.svg" alt=""><img class="alva-word" src="/assets/alva-logotipo.svg" alt="ALVA"><span>Soluciones Digitales</span></div></div>`;
    const actionHost=banner.querySelector('.ttd-shell-actions');
    moved.forEach(node=>actionHost.appendChild(node));

    const nav=document.createElement('nav');
    nav.className='ttd-global-tabs';
    nav.setAttribute('aria-label','Navegación principal de TTD Admin');
    const active=activeKey();
    nav.innerHTML=navItems.map(([key,label,href])=>`<a class="ttd-global-tab${key===active?' is-active':''}" href="${href}">${label}</a>`).join('');
    banner.insertAdjacentElement('afterend',nav);

    document.querySelectorAll('.product-tabs').forEach(el=>el.setAttribute('aria-hidden','true'));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();
