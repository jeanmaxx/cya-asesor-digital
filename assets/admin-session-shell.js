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
  try{
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
