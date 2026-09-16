(()=>{
  const params=new URLSearchParams(location.search);
  const negocio=params.get('negocio')||'tu-tarjeta-digital';
  if(negocio!=='tu-tarjeta-digital') return;

  const official='/favicon.ico?v=20260916-6';
  const absolute=new URL(official,location.origin).href;
  let enforcing=false;

  const enforce=()=>{
    if(enforcing) return;
    enforcing=true;
    try{
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
      if(primary.href!==absolute) primary.setAttribute('href',official);
      primary.setAttribute('sizes','any');
      primary.removeAttribute('type');
    } finally {
      enforcing=false;
    }
  };

  const observer=new MutationObserver(()=>queueMicrotask(enforce));
  observer.observe(document.head,{subtree:true,childList:true,attributes:true,attributeFilter:['href','rel']});

  enforce();
  window.addEventListener('load',enforce,{once:true});
  setTimeout(enforce,250);
  setTimeout(enforce,1000);
  setTimeout(enforce,2500);
})();
