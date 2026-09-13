import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.SUPABASE_CONFIG||{};
const supabase=createClient(cfg.url,cfg.publishableKey);
const $=id=>document.getElementById(id);
const storageUrl=p=>p?`${cfg.url}/storage/v1/object/public/${cfg.storageBucket}/${p}`:'';
const localUrls=new Map();
let profile=null,table='',profileId='',form=null,kind='';

function detect(){
  if($('profile-form')){form=$('profile-form');table='advisor_profiles';return'advisor'}
  if($('business-form')){form=$('business-form');table='business_profiles';profileId=new URLSearchParams(location.search).get('id')||'';return'business'}
  if($('other-form')){form=$('other-form');table='business_profiles';profileId=new URLSearchParams(location.search).get('id')||'';return'other'}
  return'';
}
kind=detect();
function ids(){return kind==='advisor'?{main:'logo-file',photo:'photo-file',slug:'slug',message:'save-message'}:kind==='business'?{main:'b-logo-file',slug:'b-slug',message:'business-save-message'}:{main:'o-logo-file',slug:'o-slug',message:'other-save-message'}}
const ID=ids();
function replaceLocal(key,file){const old=localUrls.get(key);if(old)URL.revokeObjectURL(old);if(!file){localUrls.delete(key);return''}const u=URL.createObjectURL(file);localUrls.set(key,u);return u}
async function loadProfile(){
  if(!table)return null;
  if(kind==='advisor'){
    const slug=$(ID.slug)?.value.trim();if(!slug)return null;
    const{data}=await supabase.from(table).select('*').eq('slug',slug).maybeSingle();profile=data;profileId=data?.id||'';
  }else if(profileId){const{data}=await supabase.from(table).select('*').eq('id',profileId).maybeSingle();profile=data}
  return profile;
}
function fileUrl(inputId,key){const f=$(inputId)?.files?.[0];return f?(localUrls.get(key)||replaceLocal(key,f)):''}
function mainSource(){return fileUrl(ID.main,'main')||storageUrl(profile?.logo_path)||(profile?.logo_data_url||'')}
function iconSource(){return fileUrl('vi-icon-file','icon')||storageUrl(profile?.logo_icon_path)}
function darkSource(){return fileUrl('vi-dark-file','dark')||storageUrl(profile?.logo_dark_path)}
function photoSource(){return kind==='advisor'?(fileUrl(ID.photo,'photo')||storageUrl(profile?.photo_path)):(fileUrl('vi-photo-file','photo')||storageUrl(profile?.photo_path))}
function selectedLogo(){return $('vi-logo-asset')?.value==='icon'?(iconSource()||mainSource()):mainSource()}
function logoDims(v,shape){const d=({small:{h:64,w:170},medium:{h:92,w:245},large:{h:126,w:340}})[v]||{h:92,w:245};return shape==='none'?d:{h:d.h,w:d.h}}
function photoSize(v){return({small:76,medium:104,large:138})[v]||104}
function renderPreview(){
  const stage=$('vi-preview-stage'),logo=$('vi-preview-logo'),photo=$('vi-preview-photo');if(!stage||!logo||!photo)return;
  const showLogo=$('vi-show-logo')?.checked!==false,showPhoto=!!$('vi-show-photo')?.checked,pos=$('vi-logo-position')?.value||'above',ls=$('vi-logo-size')?.value||'medium',ps=$('vi-photo-size')?.value||'medium',lshape=$('vi-logo-shape')?.value||'none',pshape=$('vi-photo-shape')?.value||'circle',fit=$('vi-logo-fit')?.value||'contain';
  const dims=logoDims(ls,lshape),src=selectedLogo(),photoSrc=photoSource();
  stage.classList.toggle('is-stack',pos!=='left');stage.style.flexDirection=pos==='left'?'row':'column';stage.style.justifyContent='center';stage.style.alignItems='center';stage.style.gap='16px';stage.style.overflow='hidden';
  if(showLogo&&src){logo.src=src;logo.style.display='block';logo.style.width=dims.w+'px';logo.style.height=dims.h+'px';logo.style.minWidth=dims.w+'px';logo.style.maxWidth=dims.w+'px';logo.style.objectFit=fit;logo.style.objectPosition='center';logo.style.padding='0';logo.style.background=lshape==='none'?'transparent':'rgba(255,255,255,.78)';logo.style.border=lshape==='none'?'0':'1px solid rgba(120,140,160,.25)';logo.style.borderRadius=lshape==='circle'?'50%':lshape==='rounded'?'20%':'0'}else{logo.removeAttribute('src');logo.style.display='none'}
  const pz=photoSize(ps);if(showPhoto&&photoSrc){photo.src=photoSrc;photo.style.display='block';photo.style.width=photo.style.height=pz+'px';photo.style.objectFit=$('vi-photo-fit')?.value||'cover';photo.style.borderRadius=pshape==='rounded'?'18%':'50%'}else{photo.removeAttribute('src');photo.style.display='none'}
  const status=$('vi-status');if(status&&$('vi-logo-asset')?.value==='icon'&&!iconSource())status.textContent='Aún no hay isotipo guardado; la vista previa usa el logo principal como respaldo.';
}
function savedCard(inputId,label,key){
  const input=$(inputId);if(!input)return;const card=input.closest('.vi-upload-card');if(!card)return;
  let wrap=card.querySelector(`[data-vi-saved="${key}"]`);if(!wrap){wrap=document.createElement('div');wrap.className='vi-saved-asset';wrap.dataset.viSaved=key;wrap.innerHTML=`<img alt="${label} guardado"><span></span>`;card.insertBefore(wrap,input)}
  const src=key==='icon'?iconSource():darkSource(),img=wrap.querySelector('img'),txt=wrap.querySelector('span');if(src){img.src=src;img.style.display='block';txt.textContent='Guardado ✓'}else{img.removeAttribute('src');img.style.display='none';txt.textContent='Aún no cargado'}
}
function refreshSaved(){savedCard('vi-icon-file','Isotipo','icon');savedCard('vi-dark-file','Logo oscuro','dark')}
function bind(){
  [ID.main,ID.photo,'vi-photo-file','vi-icon-file','vi-dark-file','vi-logo-asset','vi-show-logo','vi-show-photo','vi-logo-size','vi-photo-size','vi-logo-shape','vi-photo-shape','vi-logo-fit','vi-photo-fit','vi-logo-position'].forEach(id=>$(id)?.addEventListener('change',e=>{const f=e.target?.files?.[0];if(f){const key=id===ID.main?'main':id===ID.photo||id==='vi-photo-file'?'photo':id==='vi-icon-file'?'icon':id==='vi-dark-file'?'dark':id;replaceLocal(key,f)}queueMicrotask(()=>{renderPreview();refreshSaved()})}));
  const message=$(ID.message);if(message)new MutationObserver(async()=>{if(message.classList.contains('is-success')&&/guardad/i.test(message.textContent||'')){await loadProfile();renderPreview();refreshSaved()}}).observe(message,{childList:true,subtree:true,characterData:true,attributes:true});
}
async function init(){
  if(!kind)return;for(let i=0;i<70&&!$('vi-preview-stage');i++)await new Promise(r=>setTimeout(r,100));if(!$('vi-preview-stage'))return;
  await loadProfile();bind();renderPreview();refreshSaved();
  if(kind==='advisor'&&$(ID.slug))$(ID.slug).addEventListener('change',async()=>{await loadProfile();renderPreview();refreshSaved()});
}
window.addEventListener('beforeunload',()=>localUrls.forEach(u=>URL.revokeObjectURL(u)));
init().catch(console.error);
