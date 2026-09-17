(()=>{
  const official='/favicon.png?v=20260917-official1';
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
      primary.setAttribute('type','image/png');
      primary.setAttribute('sizes','64x64');

      document.querySelectorAll('link[rel="icon"]').forEach(link=>{
        if(link!==primary) link.remove();
      });
    } finally {
      enforcing=false;
    }
  };

  const observer=new MutationObserver(()=>queueMicrotask(enforce));
  observer.observe(document.head,{subtree:true,childList:true,attributes:true,attributeFilter:['href','rel','type']});

  enforce();
  window.addEventListener('load',enforce,{once:true});
  setTimeout(enforce,150);
  setTimeout(enforce,600);
  setTimeout(enforce,1800);
})();
