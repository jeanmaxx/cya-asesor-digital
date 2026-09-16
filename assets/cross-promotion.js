import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.SUPABASE_CONFIG||{};
if(!cfg.url||!cfg.publishableKey) throw new Error('TTD cross-promotion: Supabase no configurado.');

const supabase=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const qs=new URLSearchParams(location.search);
const path=location.pathname.toLowerCase();

function resolveAccount(){
  if(path.includes('/asesores/')) return {type:'advisor',slug:qs.get('asesor')||''};
  if(path.includes('/negocios/')||path.includes('/esteticas/')||path.includes('/otros/')) return {type:'business',slug:qs.get('negocio')||''};
  return null;
}

function referralUrl(account){
  const u=new URL('/',location.origin);
  u.searchParams.set('ref',account.slug);
  u.searchParams.set('src','cross-promo');
  u.searchParams.set('type',account.type);
  return u.toString();
}

function renderButton(account){
  if(document.querySelector('.ttd-cross-promo')) return;
  const a=document.createElement('a');
  a.className='ttd-cross-promo';
  a.href=referralUrl(account);
  a.target='_blank';
  a.rel='noopener';
  a.setAttribute('aria-label','¿Quieres una tarjeta digital? Conoce TTD');
  a.innerHTML=`<img class="ttd-cross-promo__logo" src="/assets/favicon-ttd.png?v=20260916-cross1" alt="" aria-hidden="true"><span class="ttd-cross-promo__copy"><strong>¿Quieres una tarjeta digital?</strong><small>Conoce TTD · Tu Tarjeta Digital</small></span>`;
  a.addEventListener('click',()=>{
    supabase.rpc('track_card_event',{
      p_account_type:account.type,
      p_slug:account.slug,
      p_event_type:'cross_promo_click',
      p_source:'cross_promo',
      p_session_id:null,
      p_metadata:{destination:'ttd_home',ref:account.slug}
    }).catch(()=>{});
  });
  document.body.appendChild(a);
}

async function init(){
  const account=resolveAccount();
  if(!account?.slug||account.slug==='tu-tarjeta-digital') return;
  const {data,error}=await supabase.rpc('get_public_card_features',{p_account_type:account.type,p_slug:account.slug});
  if(error||!data) return;
  const features=Array.isArray(data.features)?data.features:[];
  if(!['active','trial'].includes(data.status)||!features.includes('cross_promotion_cta')) return;
  renderButton(account);
}

init().catch(err=>console.warn('TTD cross-promotion:',err));
