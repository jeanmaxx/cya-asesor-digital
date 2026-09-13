import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.SUPABASE_CONFIG||{};
const supabase=createClient(cfg.url,cfg.publishableKey);
const slug=new URLSearchParams(location.search).get('negocio')||'tu-tarjeta-digital';
const size=v=>['small','medium','large'].includes(v)?v:'small';
let visual={tagline_size:'small',name_size:'small'};

function apply(){
  const row=document.getElementById('brand-row');if(!row)return false;
  const tagSize=size(visual.tagline_size),nameSize=size(visual.name_size);
  const wantedTag=`identity-tagline-${tagSize}`,wantedName=`identity-name-${nameSize}`;
  const all=['identity-tagline-small','identity-tagline-medium','identity-tagline-large','identity-name-small','identity-name-medium','identity-name-large'];
  let changed=false;
  all.forEach(c=>{if(row.classList.contains(c)&&c!==wantedTag&&c!==wantedName){row.classList.remove(c);changed=true}});
  if(!row.classList.contains(wantedTag)){row.classList.add(wantedTag);changed=true}
  if(!row.classList.contains(wantedName)){row.classList.add(wantedName);changed=true}
  return changed;
}

async function init(){
  const {data}=await supabase.from('business_profiles').select('visual_identity').eq('slug',slug).eq('vertical','other').maybeSingle();
  visual={...visual,...(data?.visual_identity||{})};
  let tries=0;const timer=setInterval(()=>{tries++;if(apply()||document.getElementById('brand-row')||tries>80)clearInterval(timer)},100);
  const row=document.getElementById('brand-row');
  if(row)new MutationObserver(()=>queueMicrotask(apply)).observe(row,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});
  else new MutationObserver(()=>{const r=document.getElementById('brand-row');if(r){apply();new MutationObserver(()=>queueMicrotask(apply)).observe(r,{attributes:true,attributeFilter:['class'],childList:true,subtree:false})}}).observe(document.body,{childList:true,subtree:true});
}
init();
