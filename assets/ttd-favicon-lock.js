(()=>{
  // Evita inicializar dos veces: algunas páginas cargan este archivo directamente
  // y config.js también lo inyecta para unificar el favicon en todo TTD.
  if(window.__TTD_FAVICON_LOCK__) return;
  window.__TTD_FAVICON_LOCK__=true;

  const official='/favicon.png?v=20260917-official2';
  const absolute=new URL(official,location.origin).href;
  let scheduled=false;

  const enforce=()=>{
    scheduled=false;
    let primary=document.querySelector('link[rel="icon"][data-ttd-official="primary"]');
    if(!primary){
      primary=document.querySelector('link[rel="icon"]');
      if(!primary){
        primary=document.createElement('link');
        primary.rel='icon';
        document.head.prepend(primary);
      }
      primary.dataset.ttdOfficial='primary';
    }

    // Solo escribe cuando realmente cambia el valor. Esto evita ciclos de MutationObserver.
    if(primary.href!==absolute) primary.setAttribute('href',official);
    if(primary.getAttribute('type')!=='image/png') primary.setAttribute('type','image/png');
    if(primary.getAttribute('sizes')!=='64x64') primary.setAttribute('sizes','64x64');

    document.querySelectorAll('link[rel="icon"]').forEach(link=>{
      if(link!==primary) link.remove();
    });
  };

  const schedule=()=>{
    if(scheduled) return;
    scheduled=true;
    queueMicrotask(enforce);
  };

  // Observamos solo cambios capaces de sustituir el favicon. Al ser idempotente,
  // una corrección propia no vuelve a crear un ciclo infinito.
  const observer=new MutationObserver(schedule);
  observer.observe(document.head,{subtree:true,childList:true,attributes:true,attributeFilter:['href','rel']});

  enforce();
  window.addEventListener('load',enforce,{once:true});
  setTimeout(enforce,300);
  setTimeout(enforce,1200);
})();
