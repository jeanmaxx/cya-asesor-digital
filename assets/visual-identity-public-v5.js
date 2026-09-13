import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.SUPABASE_CONFIG||{};
const supabase=createClient(cfg.url,cfg.publishableKey);
const qs=new URLSearchParams(location.search);
const slug=qs.get('negocio')||'tu-tarjeta-digital';
const storageUrl=p=>p?`${cfg.url}/storage/v1/object/public/${cfg.storageBucket}/${p}`:'';
const defaults={preset:'corporate',show_logo:true,show_photo:false,logo_size:'large',photo_size:'medium',logo_shape:'none',photo_shape:'circle',logo_fit:'contain',photo_fit:'cover',logo_position:'distributed',logo_asset:'main'};
let profile=null;
let currentCfg=null;
let themeObserver=null;

function normalizeLayout(v){return v==='distributed'||v==='grouped_left'||v==='stacked'?v:v==='left'?'grouped_left':'stacked'}
function normalizedCfg(){const c={...defaults,...(profile?.visual_identity||{})};c.logo_position=normalizeLayout(c.logo_position);return c}
function currentTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function principalLogo(){if(currentTheme()==='dark'&&profile?.logo_dark_path)return storageUrl(profile.logo_dark_path);return storageUrl(profile?.logo_path)||(profile?.logo_data_url||'')}
function selectedLogo(c){if(c.logo_asset==='icon'&&profile?.logo_icon_path)return storageUrl(profile.logo_icon_path);return principalLogo()}
function photoSrc(){return storageUrl(profile?.photo_path)}

function setSizeVars(c){
  const desktop={small:{w:260,h:120},medium:{w:380,h:180},large:{w:500,h:240}}[c.logo_size]||{w:380,h:180};
  const mobile={small:{w:180,h:84},medium:{w:220,h:104},large:{w:270,h:128}}[c.logo_size]||{w:220,h:104};
  const photoD={small:120,medium:180,large:240}[c.photo_size]||180;
  const photoM={small:96,medium:126,large:156}[c.photo_size]||126;
  const s=document.body.style;
  s.setProperty('--vi5-logo-w-d',desktop.w+'px');s.setProperty('--vi5-logo-h-d',desktop.h+'px');s.setProperty('--vi5-logo-sq-d',desktop.h+'px');
  s.setProperty('--vi5-logo-w-m',mobile.w+'px');s.setProperty('--vi5-logo-h-m',mobile.h+'px');s.setProperty('--vi5-logo-sq-m',mobile.h+'px');
  s.setProperty('--vi5-photo-d',photoD+'px');s.setProperty('--vi5-photo-m',photoM+'px');
  s.setProperty('--vi5-logo-fit',c.logo_fit||'contain');s.setProperty('--vi5-photo-fit',c.photo_fit||'cover');
}
function clearClasses(el,prefix){if(!el)return;[...el.classList].filter(x=>x.startsWith(prefix)).forEach(x=>el.classList.remove(x))}
function shapeClass(el,kind,shape){clearClasses(el,`vi5-${kind}-shape-`);el.classList.add(`vi5-${kind}-shape-${shape||'none'}`)}
function setVisible(el,visible){if(!el)return;el.classList.toggle('vi5-absent',!visible);el.setAttribute('aria-hidden',visible?'false':'true')}

function ensureOtherStructure(){
  const row=document.querySelector('.brand-row'),mark=document.getElementById('brand-mark');if(!row||!mark)return null;
  document.getElementById('vi4-other-photo')?.remove();
  let text=[...row.children].find(x=>x!==mark&&!x.classList.contains('vi5-media-group'));
  let media=row.querySelector('.vi5-media-group');
  if(!media){media=document.createElement('div');media.className='vi5-media-group';row.insertBefore(media,text||row.firstChild);media.appendChild(mark)}
  else if(mark.parentElement!==media)media.insertBefore(mark,media.firstChild);
  if(text){text.classList.add('vi5-text-block');if(text.parentElement!==row)row.appendChild(text)}
  return{row,mark,media,text};
}
function renderOtherIdentity(){
  if(!profile)return;const c=currentCfg=normalizedCfg();setSizeVars(c);document.body.classList.add('vi5-enabled','vi5-other');
  const s=ensureOtherStructure();if(!s)return;
  s.row.classList.remove('vi5-layout-distributed','vi5-layout-grouped-left','vi5-layout-stacked','vi4-distributed','vi4-grouped-left','vi4-stacked');
  s.row.classList.add(c.logo_position==='distributed'?'vi5-layout-distributed':c.logo_position==='grouped_left'?'vi5-layout-grouped-left':'vi5-layout-stacked');
  s.mark.classList.add('vi5-logo-shell');shapeClass(s.mark,'logo',c.logo_shape);
  const logo=selectedLogo(c);
  if(c.show_logo&&logo){let img=s.mark.querySelector('img');if(!img){s.mark.textContent='';img=document.createElement('img');s.mark.appendChild(img)}img.src=logo;img.alt=`Logo de ${profile.business_name||'negocio'}`;setVisible(s.mark,true)}
  else if(c.show_logo){s.mark.replaceChildren(document.createTextNode((profile.business_name||'TTD').slice(0,3).toUpperCase()));setVisible(s.mark,true)}
  else setVisible(s.mark,false);
  let photo=s.media.querySelector('#vi5-other-photo');const ps=photoSrc();
  if(c.show_photo&&ps){if(!photo){photo=document.createElement('img');photo.id='vi5-other-photo';photo.className='vi5-photo-box';s.media.appendChild(photo)}photo.src=ps;photo.alt=`Fotografía de ${profile.business_name||'negocio'}`;shapeClass(photo,'photo',c.photo_shape);setVisible(photo,true)}
  else if(photo)photo.remove();
  setVisible(s.media,(c.show_logo)||(c.show_photo&&!!ps));
  if(s.text)setVisible(s.text,true);
  renderProofLogo();
  setFavicon();
}
function renderProofLogo(){const box=document.querySelector('.proof-mark');if(!box)return;const src=currentTheme()==='dark'?(storageUrl(profile?.logo_dark_path)||storageUrl(profile?.logo_path)):(storageUrl(profile?.logo_path)||storageUrl(profile?.logo_dark_path));if(src){box.textContent='';let img=box.querySelector('img');if(!img){img=document.createElement('img');img.className='vi5-proof-logo';box.appendChild(img)}img.src=src;img.alt=`Logo de ${profile?.business_name||'TTD'}`}else box.textContent=(profile?.business_name||'TTD').slice(0,3).toUpperCase()}
function setFavicon(){const src=storageUrl(profile?.logo_icon_path)||storageUrl(profile?.logo_path);if(!src)return;let link=document.querySelector('link[rel="icon"]');if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link)}link.href=src;link.type='image/png'}

function systemTheme(){return matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}
function applyTheme(t,persist=false){
  t=t==='dark'?'dark':'light';const root=document.documentElement,s=root.style;root.dataset.theme=t;
  s.setProperty('--brand',profile?.primary_color||'#0B1F36');s.setProperty('--accent',profile?.accent_color||'#27C2C7');
  if(t==='dark'){s.setProperty('--bg','#07111D');s.setProperty('--surface','#0E1A28');s.setProperty('--text','#F3F7FB');s.setProperty('--muted','#9BACBE');s.setProperty('--line','#203347')}
  else{s.setProperty('--bg',profile?.background_color||'#F5F8FB');s.setProperty('--surface',profile?.surface_color||'#FFFFFF');s.setProperty('--text','#132033');s.setProperty('--muted','#667386');s.setProperty('--line','#DCE4EC')}
  const btn=document.getElementById('theme-toggle'),icon=document.getElementById('theme-icon');if(icon)icon.textContent=t==='dark'?'☀':'☾';if(btn){const label=t==='dark'?'Cambiar a modo claro':'Cambiar a modo oscuro';btn.setAttribute('aria-label',label);btn.title=label}
  if(persist)localStorage.setItem(`other-theme:${slug}`,t);
  renderOtherIdentity();
}
function installThemeController(){
  const old=document.getElementById('theme-toggle');if(!old)return;
  const btn=old.cloneNode(true);old.replaceWith(btn);
  const saved=localStorage.getItem(`other-theme:${slug}`);const initial=saved||(profile?.theme_mode==='system'?systemTheme():(profile?.theme_mode||'light'));
  btn.addEventListener('click',e=>{e.preventDefault();applyTheme(currentTheme()==='dark'?'light':'dark',true)});
  applyTheme(initial,false);
  if(profile?.theme_mode==='system'&&!saved){const mq=matchMedia('(prefers-color-scheme:dark)');mq.addEventListener?.('change',e=>{if(!localStorage.getItem(`other-theme:${slug}`))applyTheme(e.matches?'dark':'light',false)})}
}
async function waitRendered(){for(let i=0;i<80;i++){if(document.getElementById('hero-title')?.textContent&&document.querySelector('.brand-row'))return true;await new Promise(r=>setTimeout(r,100))}return false}
async function init(){
  if(!location.pathname.includes('/otros/'))return;
  const{data}=await supabase.from('business_profiles').select('*').eq('slug',slug).eq('vertical','other').maybeSingle();if(!data)return;profile=data;
  if(!await waitRendered())return;
  installThemeController();
  renderOtherIdentity();
  if(themeObserver)themeObserver.disconnect();themeObserver=new MutationObserver(()=>renderOtherIdentity());themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}
init().catch(console.error);
