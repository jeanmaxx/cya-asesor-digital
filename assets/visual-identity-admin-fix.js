import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.SUPABASE_CONFIG||{};
const supabase=createClient(cfg.url,cfg.publishableKey);
const $=id=>document.getElementById(id);
const storageUrl=p=>p?`${cfg.url}/storage/v1/object/public/${cfg.storageBucket}/${p}`:'';
const localUrls=new Map();
let profile=null;
let table='';
let profileId='';
let form=null;

function detect(){
  if($('profile-form')){form=$('profile-form');table='advisor_profiles';return'advisor'}
  if($('business-form')){form=$('business-form');table='business_profiles';profileId=new URLSearchParams(location.search).get('id')||'';return'business'}
  if($('other-form')){form=$('other-form');table='business_profiles';profileId=new URLSearchParams(location.search).get('id')||'';return'other'}
  return'';
}
const kind=detect();
function ids(){return kind==='advisor'?{main:'logo-file',mainPreview:'logo-preview',photo:'photo-file',slug:'slug',message:'save-message'}:kind==='business'?{main:'b-logo-file',mainPreview:'b-logo-preview',slug:'b-slug',message:'business-save-message'}:{main:'o-logo-file',mainPreview:'o-logo-preview',slug:'o-slug',message:'other-save-message'}}
const ID=ids();

async function loadProfile(){
  if(!table)return null;
  if(kind==='advisor'){
    const slug=$(ID.slug)?.value.trim();
    if(!slug)return null;
    const{data}=await supabase.from(table).select('*').eq('slug',slug).maybeSingle();
    profile=data;profileId=data?.id||'';
  }else{
    if(!profileId)return null;
    const{data}=await supabase.from(table).select('*').eq('id',profileId).maybeSingle();profile=data;
  }
  return profile;
}
function replaceLocal(key,file){
  const old=localUrls.get(key);if(old)URL.revokeObjectURL(old);
  if(!file){localUrls.delete(key);return''}
  const u=URL.createObjectURL(file);localUrls.set(key,u);return u;
}
function mainSource(){
  const input=$(ID.main),file=input?.files?.[0];
  if(file)return localUrls.get('main')||replaceLocal('main',file);
  return storageUrl(profile?.logo_path)||(profile?.logo_data_url||'');
}
function iconSource(){
  const file=$('vi-icon-file')?.files?.[0];
  if(file)return localUrls.get('icon')||replaceLocal('icon',file);
  return storageUrl(profile?.logo_icon_path);
}
function darkSource(){
  const file=$('vi-dark-file')?.files?.[0];
  if(file)return localUrls.get('dark')||replaceLocal('dark',file);
  return storageUrl(profile?.logo_dark_path);
}
function photoSource(){
  if(kind==='advisor'){
    const file=$(ID.photo)?.files?.[0];if(file)return localUrls.get('photo')||replaceLocal('photo',file);
    return storageUrl(profile?.photo_path);
  }
  const file=$('vi-photo-file')?.files?.[0];if(file)return localUrls.get('photo')||replaceLocal('photo',file);
  return storageUrl(profile?.photo_path);
}
function assetSource(){
  const wanted=$('vi-logo-asset')?.value||'main';
  return wanted==='icon'?(iconSource()||mainSource()):mainSource();
}
function sz(v,type){return type==='logo'?({small:62,medium:90,large:126}[v]||90):({small:78,medium:108,large:142}[v]||108)}
function renderPreview(){
  const stage=$('vi-preview-stage'),logo=$('vi-preview-logo'),photo=$('vi-preview-photo');if(!stage||!logo||!photo)return;
  const showLogo=$('vi-show-logo')?.checked!==false,showPhoto=!!$('vi-show-photo')?.checked,pos=$('vi-logo-position')?.value||'above',ls=$('vi-logo-size')?.value||'medium',ps=$('vi-photo-size')?.value||'medium',lshape=$('vi-logo-shape')?.value||'none',pshape=$('vi-photo-shape')?.value||'circle';
  const src=assetSource(),photoSrc=photoSource();
  stage.style.display='flex';stage.style.justifyContent='center';stage.style.alignItems='center';stage.style.textAlign='center';stage.style.flexDirection=pos==='left'?'row':'column';
  if(showLogo&&src){logo.src=src;logo.style.display='block';logo.style.height=sz(ls,'logo')+'px';logo.style.width=lshape==='none'?'auto':sz(ls,'logo')+'px';logo.style.maxWidth='min(82%, 420px)';logo.style.objectFit=$('vi-logo-fit')?.value||'contain';logo.style.borderRadius=lshape==='circle'?'50%':lshape==='rounded'?'18%':'0';}
  else{logo.removeAttribute('src');logo.style.display='none'}
  if(showPhoto&&photoSrc){photo.src=photoSrc;photo.style.display='block';photo.style.width=photo.style.height=sz(ps,'photo')+'px';photo.style.objectFit=$('vi-photo-fit')?.value||'cover';photo.style.borderRadius=pshape==='circle'?'50%':'18%'}else{photo.removeAttribute('src');photo.style.display='none'}
  const status=$('vi-status');if(status&&$('vi-logo-asset')?.value==='icon'&&!iconSource())status.textContent='Aún no hay isotipo guardado; la vista previa usa el logo principal como respaldo.';
}
function addSavedPreview(inputId,label,key){
  const input=$(inputId);if(!input)return;
  const card=input.closest('.vi-upload-card');if(!card||card.querySelector(`[data-vi-saved="${key}"]`))return;
  const wrap=document.createElement('div');wrap.className='vi-saved-asset';wrap.dataset.viSaved=key;
  const img=document.createElement('img');img.alt=`${label} guardado`;
  const text=document.createElement('span');wrap.append(img,text);card.insertBefore(wrap,input);
}
function refreshSavedCards(){
  [['vi-icon-file','Isotipo','icon'],['vi-dark-file','Logo oscuro','dark']].forEach(([id,label,key])=>{addSavedPreview(id,label,key);const wrap=document.querySelector(`[data-vi-saved="${key}"]`);if(!wrap)return;const src=key==='icon'?iconSource():darkSource(),img=wrap.querySelector('img'),txt=wrap.querySelector('span');if(src){img.src=src;img.style.display='block';txt.textContent='Guardado ✓'}else{img.removeAttribute('src');img.style.display='none';txt.textContent='Aún no cargado'}});
}
function bind(){
  const targets=[ID.main,ID.photo,'vi-photo-file','vi-icon-file','vi-dark-file','vi-logo-asset','vi-show-logo','vi-show-photo','vi-logo-size','vi-photo-size','vi-logo-shape','vi-photo-shape','vi-logo-fit','vi-photo-fit','vi-logo-position'];
  targets.forEach(id=>$(id)?.addEventListener('change',e=>{if(e.target?.files?.[0])replaceLocal(id,e.target.files[0]);setTimeout(()=>{renderPreview();refreshSavedCards()},0)}));
  const message=$(ID.message);if(message)new MutationObserver(async()=>{if(message.classList.contains('is-success')&&/guardad/i.test(message.textContent||'')){await loadProfile();renderPreview();refreshSavedCards()}}).observe(message,{childList:true,subtree:true,characterData:true,attributes:true});
}
async function init(){
  if(!kind)return;
  for(let i=0;i<60&&!$('vi-preview-stage');i++)await new Promise(r=>setTimeout(r,100));
  if(!$('vi-preview-stage'))return;
  await loadProfile();bind();renderPreview();refreshSavedCards();
  if(kind==='advisor')new MutationObserver(async()=>{const slug=$(ID.slug)?.value.trim();if(slug&&slug!==profile?.slug){await loadProfile();renderPreview();refreshSavedCards()}}).observe($(ID.slug),{attributes:true,childList:true,subtree:true});
}
window.addEventListener('beforeunload',()=>localUrls.forEach(u=>URL.revokeObjectURL(u)));
init().catch(console.error);
