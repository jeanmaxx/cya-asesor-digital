import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import QRCode from 'https://esm.sh/qrcode@1.5.4?bundle';

const cfg=window.SUPABASE_CONFIG||{};
const $=id=>document.getElementById(id);
const supabase=createClient(cfg.url,cfg.publishableKey);
const qs=new URLSearchParams(location.search);
const slug=qs.get('negocio')||'tu-tarjeta-digital';

let profile=null,services=[];
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const storageUrl=p=>p?`${cfg.url}/storage/v1/object/public/${cfg.storageBucket}/${p}`:'';
const trimmedCache=new Map();
const generatedUrls=new Set();

const identityDefaults={preset:'personal',show_logo:true,show_photo:true,logo_size:'medium',photo_size:'large',logo_shape:'none',photo_shape:'circle',logo_fit:'contain',photo_fit:'cover',logo_position:'stacked',logo_asset:'main'};

function waNumber(v){let d=String(v||'').replace(/\D/g,'');if(d.length===10)d='52'+d;return d}
function systemTheme(){return matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}
function normalizeLayout(v){return ['distributed','grouped_left','stacked'].includes(v)?v:(v==='left'?'grouped_left':'stacked')}
function identityConfig(){const raw=profile?.visual_identity||{};return{...identityDefaults,...raw,logo_position:normalizeLayout(raw.logo_position)}}
function currentTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function mainLogoUrl(){return profile?.logo_path?storageUrl(profile.logo_path):(profile?.logo_data_url||'')}
function iconLogoUrl(){return profile?.logo_icon_path?storageUrl(profile.logo_icon_path):''}
function darkLogoUrl(){return profile?.logo_dark_path?storageUrl(profile.logo_dark_path):''}
function photoUrl(){return profile?.photo_path?storageUrl(profile.photo_path):''}

async function trimTransparent(src){
  if(!src||!/^https?:|^data:image\/png/i.test(src))return src;
  if(trimmedCache.has(src))return trimmedCache.get(src);
  const promise=(async()=>{
    try{
      const response=await fetch(src,{cache:'force-cache'});if(!response.ok)return src;
      const blob=await response.blob();if(!/image\/png/i.test(blob.type||'image/png'))return src;
      const bmp=await createImageBitmap(blob),w=bmp.width,h=bmp.height;if(!w||!h)return src;
      const scan=document.createElement('canvas');scan.width=w;scan.height=h;const sx=scan.getContext('2d',{willReadFrequently:true});sx.drawImage(bmp,0,0);
      const data=sx.getImageData(0,0,w,h).data;let minX=w,minY=h,maxX=-1,maxY=-1;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(data[(y*w+x)*4+3]>8){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}}
      if(maxX<0||maxY<0)return src;
      const visibleW=maxX-minX+1,visibleH=maxY-minY+1,coverage=(visibleW*visibleH)/(w*h);
      if(coverage>.92&&minX<8&&minY<8&&maxX>w-9&&maxY>h-9)return src;
      const pad=Math.max(4,Math.round(Math.max(visibleW,visibleH)*.018));minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);
      const cw=maxX-minX+1,ch=maxY-minY+1,out=document.createElement('canvas');out.width=cw;out.height=ch;out.getContext('2d').drawImage(bmp,minX,minY,cw,ch,0,0,cw,ch);
      const outBlob=await new Promise(resolve=>out.toBlob(resolve,'image/png'));if(!outBlob)return src;
      const u=URL.createObjectURL(outBlob);generatedUrls.add(u);return u;
    }catch{return src}
  })();
  trimmedCache.set(src,promise);return promise;
}

function setFavicon(){const src=iconLogoUrl()||mainLogoUrl();if(!src)return;let link=document.querySelector('link[rel="icon"]');if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link)}link.href=src}
function selectedLogoRaw(theme=currentTheme()){const vi=identityConfig();if(vi.logo_asset==='icon')return iconLogoUrl()||mainLogoUrl();if(theme==='dark')return darkLogoUrl()||mainLogoUrl();return mainLogoUrl()}

async function renderIdentity(){
  if(!profile)return;const row=$('brand-row');if(!row)return;
  const vi=identityConfig(),layout=normalizeLayout(vi.logo_position),rawLogo=selectedLogoRaw(),logo=vi.show_logo&&rawLogo?await trimTransparent(rawLogo):'',photo=vi.show_photo&&photoUrl()?photoUrl():'';
  row.className=`brand-row identity-header identity-layout-${layout} identity-logo-${vi.logo_size||'medium'} identity-photo-${vi.photo_size||'medium'}`;row.replaceChildren();
  const media=document.createElement('div');media.className='identity-media';
  if(photo){const frame=document.createElement('div');frame.className=`identity-photo-frame identity-photo-shape-${vi.photo_shape||'circle'}`;const img=document.createElement('img');img.src=photo;img.alt=`Fotografía de ${profile.business_name||''}`;img.style.objectFit=vi.photo_fit==='contain'?'contain':'cover';frame.appendChild(img);media.appendChild(frame)}
  if(logo){const frame=document.createElement('div');frame.className=`identity-logo-frame identity-logo-shape-${vi.logo_shape||'none'}`;const img=document.createElement('img');img.src=logo;img.alt=`Logo de ${profile.business_name||''}`;img.style.objectFit=vi.logo_fit==='cover'?'cover':'contain';frame.appendChild(img);media.appendChild(frame)}
  if(media.childElementCount)row.appendChild(media);
  const copy=document.createElement('div');copy.className='identity-copy';const tag=document.createElement('p');tag.id='brand-tagline';tag.className='brand-tagline';tag.textContent=profile.tagline||profile.category||'';const name=document.createElement('strong');name.id='brand-name';name.className='brand-name';name.textContent=profile.business_name||'';copy.append(tag,name);row.appendChild(copy);row.classList.toggle('identity-no-media',!media.childElementCount);setFavicon();
}

async function renderProofLogo(){const box=document.querySelector('#proof-section .proof-mark');if(!box||!profile)return;const raw=darkLogoUrl()||mainLogoUrl()||iconLogoUrl();if(!raw){box.textContent='TTD';return}const src=await trimTransparent(raw);box.innerHTML='';const img=document.createElement('img');img.src=src;img.alt=`Logo de ${profile.business_name||''}`;img.className='proof-logo';box.appendChild(img)}

function setTheme(t,persist=false,rerender=true){
  t=t==='dark'?'dark':'light';document.documentElement.dataset.theme=t;
  const toggle=$('theme-toggle'),icon=$('theme-icon');if(icon)icon.textContent=t==='dark'?'☀':'☾';if(toggle){const label=t==='dark'?'Cambiar a modo claro':'Cambiar a modo oscuro';toggle.setAttribute('aria-label',label);toggle.setAttribute('title',label)}
  if(profile){document.documentElement.style.setProperty('--brand',profile.primary_color||'#0B1F36');document.documentElement.style.setProperty('--accent',profile.accent_color||'#27C2C7');if(t==='light'){document.documentElement.style.setProperty('--bg',profile.background_color||'#F5F8FB');document.documentElement.style.setProperty('--surface',profile.surface_color||'#FFFFFF')}else{document.documentElement.style.removeProperty('--bg');document.documentElement.style.removeProperty('--surface')}}
  if(persist)localStorage.setItem(`other-theme:${slug}`,t);if(rerender&&profile)renderIdentity();
}
$('theme-toggle')?.addEventListener('click',()=>setTheme(currentTheme()==='dark'?'light':'dark',true,true));

function baseMessage(extra=''){const b=String(profile?.whatsapp_message||`Hola, quiero información sobre ${profile?.business_name||'sus servicios'}.`).trim();return extra?`${b}\n\n${extra}`:b}
function waLink(message=''){const n=waNumber(profile?.whatsapp);return n?`https://wa.me/${n}?text=${encodeURIComponent(message||baseMessage())}`:'#'}
function publicUrl(source=''){const u=new URL(location.href);u.search='';u.searchParams.set('negocio',slug);if(source)u.searchParams.set('src',source);return u.toString()}
function renderUnavailable(kind='inactive'){const draft=kind==='draft';document.title=draft?'Tarjeta no disponible':'Tarjeta temporalmente no disponible';document.body.innerHTML=`<main style="min-height:100svh;display:grid;place-items:center;padding:28px;background:#081522;font-family:Inter,system-ui,sans-serif;color:#fff;text-align:center"><section style="width:min(100%,520px);padding:42px 30px;border:1px solid rgba(255,255,255,.12);border-radius:28px;background:rgba(255,255,255,.055)"><div style="width:72px;height:72px;margin:0 auto 24px;border-radius:20px;display:grid;place-items:center;border:1px solid rgba(39,194,199,.65);color:#7ce5e8;font-weight:900">TTD</div><p style="margin:0 0 9px;color:#7ce5e8;font-size:.7rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Tarjeta digital</p><h1 style="margin:0;font-size:clamp(2rem,8vw,2.8rem);line-height:1.06">${draft?'Tarjeta no disponible':'Tarjeta temporalmente no disponible'}</h1><p style="margin:18px auto 0;max-width:390px;color:rgba(255,255,255,.7);line-height:1.65">${draft?'Esta tarjeta todavía no se encuentra publicada.':'Esta tarjeta digital se encuentra actualmente inactiva. Intenta nuevamente más adelante.'}</p></section></main>`}
function renderFeatures(){const root=$('feature-strip');root.replaceChildren();(Array.isArray(profile.features)?profile.features:[]).slice(0,4).forEach(f=>{const d=document.createElement('article');d.className='feature-mini';d.innerHTML=`<span>${esc(f.icon||'✦')}</span><strong>${esc(f.label||'')}</strong><small>${esc(f.sub||'')}</small>`;root.appendChild(d)})}
function renderExamples(c){const root=$('examples-grid'),arr=Array.isArray(c.examples)?c.examples:[];root.replaceChildren();$('examples-section').classList.toggle('is-hidden',!arr.length);arr.forEach(x=>{const a=document.createElement('article');a.className='example-card';a.innerHTML=`<strong>${esc(x.title)}</strong><p>${esc(x.text)}</p><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.cta||'Ver ejemplo')} ↗</a>`;root.appendChild(a)})}
function renderPackages(c){const root=$('packages-grid'),arr=Array.isArray(c.packages)?structuredClone(c.packages):[];root.replaceChildren();if(!arr.length&&services.length){services.filter(x=>x.is_visible!==false).forEach(s=>arr.push({key:s.id,name:s.name,price:s.price||'',description:s.description||'',features:[],cta:'Solicitar información'}))}arr.forEach(p=>{const card=document.createElement('article');card.className=`package-card ${p.key==='pro'?'is-featured':''}`;card.innerHTML=`${p.badge?`<span class="package-badge">${esc(p.badge)}</span>`:''}<h3>${esc(p.name)}</h3><div class="package-price">${esc(p.price||'')}</div>${p.annual?`<div class="package-annual">${esc(p.annual)}</div>`:''}<p>${esc(p.description||'')}</p><ul>${(p.features||[]).map(f=>`<li>${esc(f)}</li>`).join('')}</ul>${p.activation?`<p class="package-activation">${esc(p.activation)}</p>`:''}<a class="btn btn--${p.key==='pro'?'primary':'outline'} package-whatsapp" data-package="${esc(p.name)}" target="_blank" rel="noopener">${esc(p.cta||'Solicitar información')}</a>`;card.querySelector('.package-whatsapp').href=waLink(`Me interesa el paquete *${p.name}*. ¿Me compartes más información?`);root.appendChild(card)})}
function renderProcess(c){const root=$('process-grid'),arr=Array.isArray(c.process)?c.process:[];root.replaceChildren();root.closest('.section').classList.toggle('is-hidden',!arr.length);arr.forEach(x=>{const d=document.createElement('article');d.className='process-card';d.innerHTML=`<span class="process-step">${esc(x.step)}</span><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p>`;root.appendChild(d)})}
function renderAudiences(c){const root=$('audiences'),arr=Array.isArray(c.audiences)?c.audiences:[];root.replaceChildren();root.closest('.section').classList.toggle('is-hidden',!arr.length);arr.forEach(x=>{const s=document.createElement('span');s.className='audience-chip';s.textContent=x;root.appendChild(s)})}
function renderComparison(c){const cmp=c.comparison||{},t=cmp.traditional||[],d=cmp.digital||[];$('traditional-list').innerHTML=t.map(x=>`<li>${esc(x)}</li>`).join('');$('digital-list').innerHTML=d.map(x=>`<li>${esc(x)}</li>`).join('');$('traditional-list').closest('.section').classList.toggle('is-hidden',!t.length&&!d.length)}
function renderFaq(c){const root=$('faq-list'),arr=Array.isArray(c.faqs)?c.faqs:[];root.replaceChildren();root.closest('.section').classList.toggle('is-hidden',!arr.length);arr.forEach(x=>{const d=document.createElement('details');d.className='faq-item';d.innerHTML=`<summary>${esc(x.q)}</summary><p>${esc(x.a)}</p>`;root.appendChild(d)})}
function vcard(){const n=waNumber(profile.whatsapp),lines=['BEGIN:VCARD','VERSION:3.0',`FN:${(profile.tagline||profile.business_name).replace(/[,;]/g,' ')}`,`ORG:${(profile.business_name||'').replace(/[,;]/g,' ')}`];if(n)lines.push(`TEL;TYPE=CELL:+${n}`);lines.push(`URL:${publicUrl()}`,'END:VCARD');return lines.join('\r\n')}
function downloadBlob(content,type,name){const b=new Blob([content],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function openQr(){const d=$('qr-dialog'),c=$('qr-canvas'),url=publicUrl('qr');await QRCode.toCanvas(c,url,{width:720,margin:3,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#FFFFFF'}});$('qr-link').textContent=url;d.showModal()}
function bindTools(){$('share-card').onclick=async()=>{const url=publicUrl('share');try{if(navigator.share)await navigator.share({title:document.title,text:profile.slogan||profile.tagline||'',url});else{await navigator.clipboard.writeText(url);alert('Enlace copiado.')}}catch{}};$('save-contact').onclick=()=>downloadBlob(vcard(),'text/vcard;charset=utf-8','tu-tarjeta-digital.vcf');$('show-qr').onclick=openQr;$('qr-close').onclick=()=>$('qr-dialog').close();$('qr-dialog').addEventListener('click',e=>{if(e.target===$('qr-dialog'))$('qr-dialog').close()});$('qr-copy').onclick=async()=>{await navigator.clipboard.writeText(publicUrl('qr'));$('qr-copy').textContent='Copiado ✓';setTimeout(()=>$('qr-copy').textContent='Copiar enlace',1200)};$('qr-download').onclick=()=>{const a=document.createElement('a');a.download=`qr-${slug}.png`;a.href=$('qr-canvas').toDataURL('image/png');a.click()}}

async function render(){
  const c=profile.content_config||{};document.title=profile.page_title||`${profile.business_name} · Tarjeta Digital`;document.documentElement.style.setProperty('--brand',profile.primary_color||'#0B1F36');document.documentElement.style.setProperty('--accent',profile.accent_color||'#27C2C7');const saved=localStorage.getItem(`other-theme:${slug}`),initial=saved||(profile.theme_mode==='system'?systemTheme():profile.theme_mode||'light');setTheme(initial,false,false);
  $('hero-badge').textContent=c.hero_badge||profile.category||'';$('hero-title').textContent=c.hero_title||profile.business_name;$('hero-text').textContent=c.hero_text||profile.slogan||'';$('hero-whatsapp').textContent=c.primary_cta||'Escríbeme por WhatsApp';$('hero-whatsapp').href=waLink();$('hero-secondary').textContent=c.secondary_cta||'Ver servicios';$('about-title').textContent=c.about_title||`Conoce ${profile.business_name}`;$('about-text').textContent=c.about_text||profile.slogan||'';$('proof-title').textContent=c.proof_title||'';$('proof-text').textContent=c.proof_text||'';$('proof-section').classList.toggle('is-hidden',!c.proof_title);$('final-title').textContent=c.final_title||'¿Quieres más información?';$('final-text').textContent=c.final_text||'Escríbenos por WhatsApp y con gusto te atendemos.';$('final-whatsapp').textContent=c.final_cta||'Solicitar información por WhatsApp';$('final-whatsapp').href=waLink();$('footer-name').textContent=profile.business_name;$('footer-category').textContent=profile.category||'';
  await Promise.all([renderIdentity(),renderProofLogo()]);renderFeatures();renderExamples(c);renderPackages(c);renderProcess(c);renderAudiences(c);renderComparison(c);renderFaq(c);bindTools();$('other-card').classList.remove('is-loading');
}
async function init(){const{data:p,error}=await supabase.from('business_profiles').select('*').eq('slug',slug).eq('vertical','other').eq('is_published',true).maybeSingle();if(error||!p){renderUnavailable('draft');return}let status='active';try{const{data:ctx}=await supabase.rpc('get_public_card_features',{p_account_type:'business',p_slug:slug});if(ctx?.status)status=ctx.status}catch{}if(status==='suspended'||status==='cancelled'){renderUnavailable('inactive');return}profile=p;const{data:s}=await supabase.from('business_services').select('*').eq('business_id',p.id).eq('is_visible',true).order('sort_order');services=s||[];await render()}
window.addEventListener('beforeunload',()=>generatedUrls.forEach(u=>URL.revokeObjectURL(u)));
init();
