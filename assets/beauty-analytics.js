import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.SUPABASE_CONFIG||{},supabase=createClient(cfg.url,cfg.publishableKey),qs=new URLSearchParams(location.search),slug=qs.get('negocio')||'studio-cavalier';
let profile=null,enabled=false;
function uuid(){return crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`}
function sessionId(){try{let id=sessionStorage.getItem('cya-business-card-session');if(!id){id=uuid();sessionStorage.setItem('cya-business-card-session',id)}return id}catch{return uuid()}}
const sid=sessionId();
async function track(eventType,metadata={}){if(!enabled||!profile)return;try{await supabase.rpc('track_card_event',{p_account_type:'business',p_slug:slug,p_event_type:eventType,p_source:qs.get('src')||'direct',p_session_id:sid,p_metadata:metadata})}catch{}}
async function init(){
  const {data:p}=await supabase.from('business_profiles').select('id,slug,is_published').eq('slug',slug).eq('is_published',true).maybeSingle();if(!p)return;profile=p;
  try{const {data:ctx}=await supabase.rpc('get_public_card_features',{p_account_type:'business',p_slug:slug});enabled=Array.isArray(ctx?.features)&&ctx.features.includes('analytics')}catch{}
  if(!enabled)return;
  await track('page_view',{path:location.pathname});
  document.addEventListener('click',e=>{const el=e.target.closest('a,button');if(!el)return;
    if(el.id==='booking-cta')track('booking_click',{placement:'hero'});
    else if(el.matches('.service-book')){const card=el.closest('.service-card');track('service_click',{service_title:card?.querySelector('.service-info strong')?.textContent||'Servicio'});track('booking_click',{placement:'service'});}
    else if(el.id==='booking-whatsapp'){track('booking_click',{placement:'confirmation'});track('whatsapp_click',{placement:'booking'});}
    else if(el.id==='maps-link')track('map_click');
    else if(el.id==='review-link')track('review_click');
    else if(el.matches('.link-card')){const label=(el.querySelector('strong')?.textContent||'').toLowerCase();if(label.includes('whatsapp'))track('whatsapp_click',{placement:'links'});else if(label.includes('instagram'))track('instagram_click');else if(label.includes('facebook'))track('facebook_click');}
  },true);
}
init();
