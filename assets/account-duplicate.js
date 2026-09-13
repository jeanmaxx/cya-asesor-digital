import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.SUPABASE_CONFIG||{};
const supabase=createClient(cfg.url,cfg.publishableKey);
const esc=v=>String(v??'').trim();
let isSuper=false;

async function loadRole(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return false;
  const {data}=await supabase.from('platform_users').select('platform_role').eq('user_id',user.id).maybeSingle();
  isSuper=data?.platform_role==='super_admin';
  return isSuper;
}

function button(){
  const b=document.createElement('button');
  b.type='button';b.className='secondary-btn duplicate-card-btn';b.textContent='Duplicar';
  return b;
}

async function duplicateAdvisor(card){
  const slug=esc(card.querySelector('code')?.textContent);if(!slug)return;
  if(!confirm('Se creará una copia en borrador con el mismo diseño, servicios y paquete. Las analíticas y accesos no se copiarán. ¿Continuar?'))return;
  const b=card.querySelector('.duplicate-card-btn');if(b){b.disabled=true;b.textContent='Duplicando…'}
  try{
    const {data:src,error:qe}=await supabase.from('advisor_profiles').select('id').eq('slug',slug).maybeSingle();if(qe||!src)throw qe||new Error('No se encontró la tarjeta.');
    const {data:newId,error}=await supabase.rpc('duplicate_advisor_account',{p_source_id:src.id});if(error)throw error;
    try{await supabase.rpc('create_platform_backup',{p_backup_type:'automatic'})}catch{}
    const {data:copy}=await supabase.from('advisor_profiles').select('slug').eq('id',newId).maybeSingle();
    if(copy?.slug)localStorage.setItem('cya-open-duplicated-advisor',copy.slug);
    location.reload();
  }catch(e){alert(e.message||'No fue posible duplicar la tarjeta.');if(b){b.disabled=false;b.textContent='Duplicar'}}
}

async function duplicateBusiness(card){
  const slug=esc(card.querySelector('code')?.textContent);if(!slug)return;
  if(!confirm('Se creará una copia en borrador con el mismo diseño, servicios, agenda y paquete. Las analíticas y accesos no se copiarán. ¿Continuar?'))return;
  const b=card.querySelector('.duplicate-card-btn');if(b){b.disabled=true;b.textContent='Duplicando…'}
  try{
    const {data:src,error:qe}=await supabase.from('business_profiles').select('id').eq('slug',slug).maybeSingle();if(qe||!src)throw qe||new Error('No se encontró el negocio.');
    const {data:newId,error}=await supabase.rpc('duplicate_business_account',{p_source_id:src.id});if(error)throw error;
    try{await supabase.rpc('create_platform_backup',{p_backup_type:'automatic'})}catch{}
    location.href=`negocio.html?id=${encodeURIComponent(newId)}`;
  }catch(e){alert(e.message||'No fue posible duplicar la tarjeta.');if(b){b.disabled=false;b.textContent='Duplicar'}}
}

function enhanceAdvisor(){
  const root=document.getElementById('accounts-list');if(!root||!isSuper)return;
  root.querySelectorAll('.account-card').forEach(card=>{
    const actions=card.querySelector('.account-actions');if(!actions||actions.querySelector('.duplicate-card-btn'))return;
    const b=button();b.addEventListener('click',()=>duplicateAdvisor(card));actions.insertBefore(b,actions.lastElementChild||null);
  });
  const pending=localStorage.getItem('cya-open-duplicated-advisor');
  if(pending){const match=[...root.querySelectorAll('.account-card')].find(c=>esc(c.querySelector('code')?.textContent)===pending);if(match){localStorage.removeItem('cya-open-duplicated-advisor');setTimeout(()=>match.querySelector('.edit-account')?.click(),120)}}
}
function enhanceBusiness(){
  const root=document.getElementById('business-list');if(!root||!isSuper)return;
  root.querySelectorAll('.account-card').forEach(card=>{
    const actions=card.querySelector('.account-actions');if(!actions||actions.querySelector('.duplicate-card-btn'))return;
    const b=button();b.addEventListener('click',()=>duplicateBusiness(card));actions.insertBefore(b,actions.lastElementChild||null);
  });
}

if(await loadRole()){
  const ar=document.getElementById('accounts-list');if(ar){new MutationObserver(enhanceAdvisor).observe(ar,{childList:true,subtree:true});enhanceAdvisor()}
  const br=document.getElementById('business-list');if(br){new MutationObserver(enhanceBusiness).observe(br,{childList:true,subtree:true});enhanceBusiness()}
}
