import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.SUPABASE_CONFIG||{};

function normalizeProductNavigation(){
  const nav=document.querySelector('.product-tabs');
  if(!nav)return;
  const existing=[...nav.children].find(el=>el.textContent?.toUpperCase().includes('TRANSPORTE'));
  if(existing){
    const a=document.createElement('a');
    a.className='product-tab';
    a.href='otros.html';
    a.textContent='OTROS NEGOCIOS';
    existing.replaceWith(a);
  }
  if(location.pathname.endsWith('/otros.html')){
    nav.querySelectorAll('.product-tab').forEach(x=>x.classList.remove('is-active'));
    const other=[...nav.querySelectorAll('.product-tab')].find(x=>x.getAttribute('href')==='otros.html');
    other?.classList.add('is-active');
  }
}
normalizeProductNavigation();

if(cfg.url&&cfg.publishableKey){
  const supabase=createClient(cfg.url,cfg.publishableKey);
  const auth=document.getElementById('auth-panel');
  const allowedAlvaOrigins=new Set([
    'https://alva-sd.pages.dev',
    'https://alvasd.com',
    'https://www.alvasd.com',
    'https://admin.alvasd.com'
  ]);

  let handoffResolved=false;
  let resolveHandoff;
  const handoff=new Promise(resolve=>{resolveHandoff=resolve});

  const finishHandoff=value=>{
    if(handoffResolved)return;
    handoffResolved=true;
    resolveHandoff?.(value);
  };

  window.addEventListener('message',async event=>{
    if(!allowedAlvaOrigins.has(event.origin))return;
    if(window.opener&&event.source!==window.opener)return;
    const payload=event.data||{};
    if(payload.type!=='alva-ttd-session'||!payload.access_token||!payload.refresh_token)return;
    try{
      const {data,error}=await supabase.auth.setSession({access_token:payload.access_token,refresh_token:payload.refresh_token});
      if(error||!data?.session){finishHandoff(false);return}
      const {data:isAdmin}=await supabase.rpc('is_super_admin');
      if(!isAdmin){await supabase.auth.signOut();finishHandoff(false);return}
      sessionStorage.setItem('ttd-alva-handoff','1');
      finishHandoff(true);
      try{window.opener=null}catch{}
      location.reload();
    }catch{finishHandoff(false)}
  });

  try{
    const {data:{session:initialSession}}=await supabase.auth.getSession();
    if(!initialSession&&window.opener){
      try{window.opener.postMessage({type:'ttd-admin-ready'},'*')}catch{}
      setTimeout(()=>finishHandoff(false),1400);
      await handoff;
    }

    const {data:{session}}=await supabase.auth.getSession();
    if(!session){auth?.classList.remove('is-hidden')}
    else{
      try{
        const {data:isAdmin}=await supabase.rpc('is_super_admin');
        if(isAdmin){
          const nav=document.querySelector('.product-tabs');
          if(nav&&!nav.querySelector('[data-management-tab]')){
            const a=document.createElement('a');
            a.className='product-tab';a.dataset.managementTab='1';a.href='administracion.html';a.textContent='ADMINISTRACIÓN';
            nav.prepend(a);
          }
        }
      }catch{}
    }
  }catch{auth?.classList.remove('is-hidden')}
}
