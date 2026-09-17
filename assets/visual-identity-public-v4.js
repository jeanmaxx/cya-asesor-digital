import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.SUPABASE_CONFIG||{};
const supabase=createClient(cfg.url,cfg.publishableKey);
const qs=new URLSearchParams(location.search);
const storageUrl=p=>p?`${cfg.url}/storage/v1/object/public/${cfg.storageBucket}/${p}`:'';
const defaultsAdvisor={preset:'personal',show_logo:true,show_photo:true,logo_size:'medium',photo_size:'large',logo_shape:'none',photo_shape:'circle',logo_fit:'contain',photo_fit:'cover',logo_position:'stacked',logo_asset:'main',header_text_size:'medium',header_text_align:'left'};
const defaultsBusiness={preset:'corporate',show_logo:true,show_photo:false,logo_size:'large',photo_size:'medium',logo_shape:'none',photo_shape:'circle',logo_fit:'contain',photo_fit:'cover',logo_position:'distributed',logo_asset:'main'};

function detect(){const p=location.pathname.toLowerCase();if(p.includes('/admin/'))return null;if(p.includes('/esteticas/')||p.includes('/barberias/'))return{kind:'beauty',table:'business_profiles',slug:qs.get('negocio')||'studio-cavalier',vertical:'beauty'};if(p.includes('/otros/'))return{kind:'other',table:'business_profiles',slug:qs.get('negocio')||'tu-tarjeta-digital',vertical:'other'};return{kind:'advisor',table:'advisor_profiles',slug:qs.get('asesor')||cfg.defaultSlug||'demo-publica'}}
function normalizeLayout(v){return v==='distributed'||v==='grouped_left'||v==='stacked'?v:v==='left'?'grouped_left':'stacked'}
function normalizeTextSize(v){return ['small','medium','large'].includes(v)?v:'medium'}
function normalizeTextAlign(v){return ['left','center','right'].includes(v)?v:'left'}
function cfgFor(p,kind){const d=kind==='advisor'?defaultsAdvisor:defaultsBusiness;const c={...d,...(p.visual_identity||{}),logo_position:normalizeLayout(p.visual_identity?.logo_position)};if(kind==='advisor'){c.header_text_size=normalizeTextSize(c.header_text_size);c.header_text_align=normalizeTextAlign(c.header_text_align)}return c}
function theme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function logoSrc(p,c){if(c.logo_asset==='icon'&&p.logo_icon_path)return storageUrl(p.logo_icon_path);if(theme()==='dark'&&p.logo_dark_path)return storageUrl(p.logo_dark_path);return storageUrl(p.logo_path)||(p.logo_data_url||'')}
function photoSrc(p){return storageUrl(p.photo_path)}
function setVars(c){const logoDesktop={small:120,medium:180,large:240}[c.logo_size]||180,photoDesktop={small:110,medium:160,large:220}[c.photo_size]||160,logoMobile={small:64,medium:92,large:126}[c.logo_size]||92,photoMobile={small:88,medium:124,large:168}[c.photo_size]||124;const s=document.body.style;s.setProperty('--vi4-logo-d',logoDesktop+'px');s.setProperty('--vi4-photo-d',photoDesktop+'px');s.setProperty('--vi4-logo-m',logoMobile+'px');s.setProperty('--vi4-photo-m',photoMobile+'px');s.setProperty('--vi4-logo-fit',c.logo_fit||'contain');s.setProperty('--vi4-photo-fit',c.photo_fit||'cover')}
function setFavicon(){/* El favicon pertenece al producto TTD; los logos de cada cuenta no deben sustituirlo. */}
function shapeClasses(el,shape,prefix){if(!el)return;el.classList.remove(`${prefix}-none`,`${prefix}-circle`,`${prefix}-rounded`);el.classList.add(`${prefix}-${shape||'none'}`)}
function ensureImg(container,id,alt){let img=container.querySelector(`#${id}`);if(!img){img=document.createElement('img');img.id=id;img.alt=alt;container.textContent='';container.appendChild(img)}return img}
function applyMedia(img,src,show){if(!img)return;if(src){img.src=src;img.hidden=!show}else{img.removeAttribute('src');img.hidden=true}}

function otherLayout(p,c){
  const row=document.querySelector('.brand-row'),mark=document.getElementById('brand-mark');if(!row||!mark)return;
  row.classList.remove('vi4-distributed','vi4-grouped-left','vi4-stacked');row.classList.add(c.logo_position==='distributed'?'vi4-distributed':c.logo_position==='grouped_left'?'vi4-grouped-left':'vi4-stacked');
  mark.classList.add('vi4-logo-box');shapeClasses(mark,c.logo_shape,'vi4-logo-shape');
  const img=ensureImg(mark,'vi4-other-logo',`Logo de ${p.business_name||'negocio'}`);applyMedia(img,logoSrc(p,c),c.show_logo);mark.hidden=!c.show_logo||!logoSrc(p,c);
  let photo=document.getElementById('vi4-other-photo');if(!photo){photo=document.createElement('img');photo.id='vi4-other-photo';photo.className='vi4-photo-box';const text=row.querySelector('div:not(#brand-mark)');row.insertBefore(photo,text||null)}shapeClasses(photo,c.photo_shape,'vi4-photo-shape');applyMedia(photo,photoSrc(p),c.show_photo);photo.hidden=!c.show_photo||!photoSrc(p);
  const text=[...row.children].find(x=>x!==mark&&x!==photo);if(text)text.classList.add('vi4-text-block');
}
function beautyLayout(p,c){
  const hero=document.querySelector('.hero'),logo=document.getElementById('business-logo'),tag=document.getElementById('business-tagline'),name=document.getElementById('business-name');if(!hero||!logo||!tag||!name)return;
  let stage=document.getElementById('vi4-beauty-stage');if(!stage){stage=document.createElement('div');stage.id='vi4-beauty-stage';stage.className='vi4-header-stage';hero.insertBefore(stage,tag);const text=document.createElement('div');text.className='vi4-text-block';text.id='vi4-beauty-text';text.append(tag,name);stage.append(logo,text)}
  stage.classList.remove('vi4-distributed','vi4-grouped-left','vi4-stacked');stage.classList.add(c.logo_position==='distributed'?'vi4-distributed':c.logo_position==='grouped_left'?'vi4-grouped-left':'vi4-stacked');
  logo.classList.add('vi4-logo-box');shapeClasses(logo,c.logo_shape,'vi4-logo-shape');applyMedia(logo,logoSrc(p,c),c.show_logo);logo.hidden=!c.show_logo||!logoSrc(p,c);
  const src=photoSrc(p);let photo=document.getElementById('vi4-beauty-photo');
  if(c.show_photo&&src){if(!photo){photo=document.createElement('img');photo.id='vi4-beauty-photo';photo.className='vi4-photo-box';stage.insertBefore(photo,document.getElementById('vi4-beauty-text'))}shapeClasses(photo,c.photo_shape,'vi4-photo-shape');applyMedia(photo,src,true);photo.hidden=false}else if(photo){photo.remove()}
}
function advisorLayout(p,c){
  const hero=document.querySelector('.hero'),top=document.querySelector('.hero-top'),brand=document.querySelector('.brand-lockup'),portrait=document.querySelector('.portrait-wrap'),logo=document.getElementById('brand-logo'),photo=document.getElementById('advisor-photo');if(!hero||!top||!brand||!portrait||!logo||!photo)return;
  let stage=document.getElementById('vi4-advisor-stage');if(!stage){stage=document.createElement('div');stage.id='vi4-advisor-stage';stage.className='vi4-header-stage';top.insertAdjacentElement('afterend',stage);stage.append(brand,portrait)}
  stage.classList.remove('vi4-distributed','vi4-grouped-left','vi4-stacked');stage.classList.add(c.logo_position==='distributed'?'vi4-distributed':c.logo_position==='grouped_left'?'vi4-grouped-left':'vi4-stacked');
  brand.hidden=!c.show_logo;portrait.hidden=!c.show_photo;brand.classList.add('vi4-advisor-brand');logo.classList.add('vi4-logo-box');shapeClasses(logo,c.logo_shape,'vi4-logo-shape');applyMedia(logo,logoSrc(p,c),c.show_logo);photo.classList.add('vi4-photo-box');shapeClasses(photo,c.photo_shape,'vi4-photo-shape');if(photoSrc(p))photo.src=photoSrc(p);photo.style.objectFit=c.photo_fit||'cover';
  const ally=document.getElementById('ally-label');if(ally){const sizes={small:'clamp(.62rem,.95vw,.74rem)',medium:'clamp(.72rem,1.2vw,.86rem)',large:'clamp(.86rem,1.45vw,1.04rem)'};ally.style.setProperty('--advisor-header-text-size',sizes[normalizeTextSize(c.header_text_size)]);ally.style.setProperty('--advisor-header-text-align',normalizeTextAlign(c.header_text_align));ally.dataset.headerTextSize=normalizeTextSize(c.header_text_size);ally.dataset.headerTextAlign=normalizeTextAlign(c.header_text_align)}
  const footer=document.getElementById('footer-logo');if(footer&&logoSrc(p,c))footer.src=logoSrc(p,c)
}
function apply(p,d){const c=cfgFor(p,d.kind);document.body.classList.add('vi4-enabled',`vi4-${d.kind}`);setVars(c);setFavicon();if(d.kind==='other')otherLayout(p,c);else if(d.kind==='beauty')beautyLayout(p,c);else advisorLayout(p,c);return c}
async function waitRendered(d){for(let i=0;i<60;i++){if(d.kind==='advisor'){if(!document.body.classList.contains('profile-loading'))return}else if(d.kind==='beauty'){if(document.getElementById('business-name')?.textContent)return}else if(document.getElementById('hero-title')?.textContent)return;await new Promise(r=>setTimeout(r,100))}}
async function init(){const d=detect();if(!d)return;let q=supabase.from(d.table).select('*').eq('slug',d.slug);if(d.vertical)q=q.eq('vertical',d.vertical);const{data:p}=await q.maybeSingle();if(!p)return;await waitRendered(d);apply(p,d);new MutationObserver(()=>apply(p,d)).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']})}
init().catch(console.error);
