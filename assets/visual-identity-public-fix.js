import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.SUPABASE_CONFIG||{};
const supabase=createClient(cfg.url,cfg.publishableKey);
const qs=new URLSearchParams(location.search);
const storageUrl=p=>p?`${cfg.url}/storage/v1/object/public/${cfg.storageBucket}/${p}`:'';

function logoSource(profile,config){
  if(config.logo_asset==='icon'&&profile.logo_icon_path)return storageUrl(profile.logo_icon_path);
  if(document.documentElement.dataset.theme==='dark'&&profile.logo_dark_path)return storageUrl(profile.logo_dark_path);
  return storageUrl(profile.logo_path)||(profile.logo_data_url||'');
}
function sizeMap(value){
  return ({small:{h:64,w:170},medium:{h:92,w:245},large:{h:126,w:340}})[value]||{h:92,w:245};
}
function ensureFavicon(src){
  if(!src)return;
  let link=document.querySelector('link[data-vi-favicon]')||document.querySelector('link[rel="icon"]');
  if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link)}
  link.dataset.viFavicon='1';link.href=src;link.type='image/png';
}
function getBrandCopy(row,mark){
  return [...row.children].find(el=>el!==mark&&!el.classList.contains('vi-business-photo'))||null;
}
function ensurePhoto(row,mark){
  let photo=document.getElementById('vi-business-photo');
  if(!photo){photo=document.createElement('img');photo.id='vi-business-photo';photo.className='vi-business-photo';photo.alt='Fotografía de perfil';mark.insertAdjacentElement('afterend',photo)}
  return photo;
}
function applyOther(profile){
  const row=document.querySelector('.brand-row'),mark=document.getElementById('brand-mark');
  if(!row||!mark)return;
  const c={preset:'corporate',show_logo:true,show_photo:false,logo_size:'medium',photo_size:'medium',logo_shape:'none',photo_shape:'circle',logo_fit:'contain',photo_fit:'cover',logo_position:'above',logo_asset:'main',...(profile.visual_identity||{})};
  const dims=sizeMap(c.logo_size);
  const shape=c.logo_shape||'none';
  const boxW=shape==='none'?dims.w:dims.h;
  const boxH=dims.h;
  const brandCopy=getBrandCopy(row,mark);
  const photo=ensurePhoto(row,mark);
  const src=logoSource(profile,c);
  const icon=storageUrl(profile.logo_icon_path);
  ensureFavicon(icon||src);

  row.classList.add('vi3-identity-slot');
  row.classList.remove('vi3-left','vi3-center','vi3-above');
  row.classList.add(c.logo_position==='left'?'vi3-left':c.logo_position==='center'?'vi3-center':'vi3-above');
  row.style.setProperty('--vi3-logo-w',`${boxW}px`);
  row.style.setProperty('--vi3-logo-h',`${boxH}px`);
  row.style.setProperty('--vi3-photo',`${({small:76,medium:104,large:138}[c.photo_size]||104)}px`);

  mark.className=`brand-mark vi3-logo-box vi3-shape-${shape}`;
  mark.style.width=`${boxW}px`;
  mark.style.height=`${boxH}px`;
  mark.style.minWidth=`${boxW}px`;
  mark.style.maxWidth=`${boxW}px`;
  mark.style.minHeight=`${boxH}px`;
  mark.style.maxHeight=`${boxH}px`;
  mark.style.overflow='hidden';
  mark.style.display=c.show_logo?'grid':'none';
  mark.style.background=shape==='none'?'transparent':'color-mix(in srgb,var(--surface,#fff) 94%,transparent)';
  mark.style.boxShadow='none';
  mark.style.borderRadius=shape==='circle'?'50%':shape==='rounded'?'20%':'0';

  let img=mark.querySelector('img');
  if(src){
    if(!img){mark.textContent='';img=document.createElement('img');img.alt=`Logo de ${profile.business_name||'negocio'}`;mark.appendChild(img)}
    if(img.src!==src)img.src=src;
    img.removeAttribute('style');
    img.className='vi3-logo-image';
    img.style.width='100%';img.style.height='100%';img.style.maxWidth='100%';img.style.maxHeight='100%';img.style.objectFit=c.logo_fit==='cover'?'cover':'contain';img.style.objectPosition='center';img.style.display='block';
  }else if(c.show_logo){mark.textContent=(profile.business_name||'TTD').slice(0,3).toUpperCase()}

  const photoSrc=storageUrl(profile.photo_path);
  if(c.show_photo&&photoSrc){
    photo.src=photoSrc;photo.style.display='block';photo.style.width='var(--vi3-photo)';photo.style.height='var(--vi3-photo)';photo.style.objectFit=c.photo_fit==='contain'?'contain':'cover';photo.style.borderRadius=c.photo_shape==='rounded'?'18%':'50%';
  }else photo.style.display='none';

  if(brandCopy){
    brandCopy.classList.add('vi3-brand-copy');
    brandCopy.style.textAlign=c.logo_position==='left'?'left':'center';
    brandCopy.style.display='block';
  }
}

async function init(){
  if(!location.pathname.includes('/otros/'))return;
  const slug=qs.get('negocio')||'tu-tarjeta-digital';
  const{data:profile}=await supabase.from('business_profiles').select('*').eq('slug',slug).eq('vertical','other').maybeSingle();
  if(!profile)return;
  for(let i=0;i<60&&!document.getElementById('hero-title')?.textContent;i++)await new Promise(r=>setTimeout(r,100));
  const apply=()=>queueMicrotask(()=>applyOther(profile));
  apply();
  new MutationObserver(apply).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}
init().catch(console.error);
