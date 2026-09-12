import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import QRCode from 'https://esm.sh/qrcode@1.5.4?bundle';

const cfg=window.SUPABASE_CONFIG||{};
const fallback=window.ADVISOR_FALLBACK||{};
const qs=new URLSearchParams(location.search);
const slug=qs.get('asesor')||cfg.defaultSlug||fallback.slug||'demo-publica';
const supabase=cfg.url&&cfg.publishableKey?createClient(cfg.url,cfg.publishableKey):null;
const LAB_SLUG='emmanuel-alvarez';
let profile=null;
let features=new Set();
let qrDialog=null;
let qrCanvas=null;
let toastTimer=null;

function uuid(){if(crypto?.randomUUID)return crypto.randomUUID();return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)})}
function sessionId(){try{let id=sessionStorage.getItem('cya-card-session');if(!id){id=uuid();sessionStorage.setItem('cya-card-session',id)}return id}catch{return uuid()}}
const visitSession=sessionId();
function has(name){return features.has(name)}
function escV(v){return String(v||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
function safeFile(v){return String(v||'tarjeta').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'tarjeta'}
function cardUrl(source=''){const u=new URL(location.href);u.hash='';u.search='';const explicit=qs.has('asesor');if(slug&&(explicit||slug!==cfg.defaultSlug))u.searchParams.set('asesor',slug);if(source)u.searchParams.set('src',source);return u.toString()}
function showToast(text){let el=document.getElementById('phase1-toast');if(!el){el=document.createElement('div');el.id='phase1-toast';el.className='phase1-toast';document.body.appendChild(el)}el.textContent=text;el.classList.add('is-visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),2200)}
function downloadBlob(content,type,name){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}

async function fetchContext(){
  if(!supabase)return;
  const {data}=await supabase.from('advisor_profiles').select('id,slug,first_names,last_names,title,company_name,phone,whatsapp,instagram_url,facebook_url,is_published').eq('slug',slug).eq('is_published',true).maybeSingle();
  profile=data||null;
  try{
    const {data:ctx,error}=await supabase.rpc('get_public_card_features',{p_account_type:'advisor',p_slug:slug});
    if(!error&&ctx&&Array.isArray(ctx.features))features=new Set(ctx.features);
  }catch{}
  if(!features.size){
    if(slug===LAB_SLUG)features=new Set(['landing','nfc_qr','whatsapp','social_links','contact','admin_panel','theme','services','reviews','gallery','vcard','booking','analytics']);
    else features=new Set(['landing','nfc_qr','whatsapp','social_links','contact']);
  }
}

async function track(eventType,metadata={}){
  if(!supabase||!has('analytics'))return;
  try{await supabase.rpc('track_card_event',{p_account_type:'advisor',p_slug:slug,p_event_type:eventType,p_source:qs.get('src')||'direct',p_session_id:visitSession,p_metadata:metadata})}catch{}
}

function vcardText(){
  const first=profile?.first_names||document.getElementById('advisor-first')?.textContent||'';
  const last=profile?.last_names||document.getElementById('advisor-last')?.textContent||'';
  const full=`${first} ${last}`.trim();
  const title=profile?.title||document.getElementById('advisor-role')?.textContent||'';
  const org=profile?.company_name||'Casillas & Asociados';
  const phone=(profile?.phone||profile?.whatsapp||'').replace(/[^+\d]/g,'');
  const lines=['BEGIN:VCARD','VERSION:3.0',`N:${escV(last)};${escV(first)};;;`,`FN:${escV(full)}`,`ORG:${escV(org)}`,`TITLE:${escV(title)}`];
  if(phone)lines.push(`TEL;TYPE=CELL,VOICE:${escV(phone)}`);
  lines.push(`URL:${escV(cardUrl())}`);
  if(profile?.instagram_url)lines.push(`URL;TYPE=Instagram:${escV(profile.instagram_url)}`);
  if(profile?.facebook_url)lines.push(`URL;TYPE=Facebook:${escV(profile.facebook_url)}`);
  lines.push('END:VCARD');return lines.join('\r\n');
}

function downloadVcard(){const name=safeFile(`${profile?.first_names||'contacto'}-${profile?.last_names||''}`);downloadBlob(vcardText(),'text/vcard;charset=utf-8',`${name}.vcf`);track('vcard_download');showToast('Contacto listo para guardar')}

async function shareCard(){const url=cardUrl('share');const full=`${profile?.first_names||document.getElementById('advisor-first')?.textContent||''} ${profile?.last_names||document.getElementById('advisor-last')?.textContent||''}`.trim();try{if(navigator.share){await navigator.share({title:document.title,text:`Tarjeta digital de ${full}`,url});await track('share_click');return}await navigator.clipboard.writeText(url);showToast('Enlace copiado');await track('share_click')}catch(err){if(err?.name!=='AbortError'){try{await navigator.clipboard.writeText(url);showToast('Enlace copiado');await track('share_click')}catch{showToast('No fue posible compartir')}}}}

function ensureQrDialog(){if(qrDialog)return;qrDialog=document.createElement('dialog');qrDialog.className='qr-dialog';qrDialog.innerHTML=`<div class="qr-card"><button class="qr-close" type="button" aria-label="Cerrar">×</button><h3>Comparte esta tarjeta</h3><p>Escanea el código para abrir la tarjeta directamente.</p><div class="qr-canvas-wrap"><canvas id="phase1-qr-canvas" width="280" height="280"></canvas></div><code id="phase1-qr-link" class="qr-link"></code><div class="qr-actions"><button id="phase1-qr-download" class="qr-primary" type="button">Descargar QR</button><button id="phase1-copy-link" class="qr-secondary" type="button">Copiar enlace</button></div></div>`;document.body.appendChild(qrDialog);qrCanvas=qrDialog.querySelector('#phase1-qr-canvas');qrDialog.querySelector('.qr-close').onclick=()=>qrDialog.close();qrDialog.addEventListener('click',e=>{if(e.target===qrDialog)qrDialog.close()});qrDialog.querySelector('#phase1-copy-link').onclick=async()=>{await navigator.clipboard.writeText(cardUrl());showToast('Enlace copiado')};qrDialog.querySelector('#phase1-qr-download').onclick=()=>{const a=document.createElement('a');a.download=`qr-${safeFile(slug)}.png`;a.href=qrCanvas.toDataURL('image/png');a.click();track('qr_download');showToast('QR descargado')}}
async function openQr(){ensureQrDialog();const url=cardUrl('qr');qrDialog.querySelector('#phase1-qr-link').textContent=url;await QRCode.toCanvas(qrCanvas,url,{width:280,margin:2,color:{dark:'#000000',light:'#FFFFFF'},errorCorrectionLevel:'M'});qrDialog.showModal()}

function icon(type){const icons={contact:'<svg viewBox="0 0 24 24"><path d="M15 19a6 6 0 0 0-12 0"/><circle cx="9" cy="7" r="4"/><path d="M17 8h4M19 6v4"/></svg>',share:'<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>',qr:'<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 14h2v2h-2zM19 14h1v3h-3v3h-3v-3M19 19h1v1"/></svg>'};return icons[type]}
function injectUtilities(){const social=document.querySelector('.social-row');if(!social||document.getElementById('card-utility-row'))return;const row=document.createElement('div');row.id='card-utility-row';row.className='card-utility-row';const buttons=[];if(has('vcard'))buttons.push(`<button id="save-vcard" class="card-utility-btn" type="button">${icon('contact')}<span>Guardar contacto</span></button>`);buttons.push(`<button id="share-card" class="card-utility-btn" type="button">${icon('share')}<span>Compartir</span></button>`);if(has('nfc_qr'))buttons.push(`<button id="show-qr" class="card-utility-btn" type="button">${icon('qr')}<span>QR</span></button>`);row.innerHTML=buttons.join('');row.style.gridTemplateColumns=`repeat(${Math.max(1,buttons.length)},minmax(0,1fr))`;social.insertAdjacentElement('afterend',row);document.getElementById('save-vcard')?.addEventListener('click',downloadVcard);document.getElementById('share-card')?.addEventListener('click',shareCard);document.getElementById('show-qr')?.addEventListener('click',openQr)}

function bindAnalytics(){document.addEventListener('click',e=>{const el=e.target.closest('a,button');if(!el)return;if(el.matches('#whatsapp-primary,#whatsapp-closing,#floating-whatsapp'))track('whatsapp_click',{placement:el.id});else if(el.matches('#call-link'))track('call_click');else if(el.matches('#instagram-link'))track('instagram_click');else if(el.matches('#facebook-link'))track('facebook_click');else if(el.matches('.service-cta')){const card=el.closest('.service-card');track('service_click',{service_key:card?.id||'',service_title:card?.querySelector('h3')?.innerText||''});track('whatsapp_click',{placement:'service',service_key:card?.id||''})}},true)}

async function init(){await fetchContext();injectUtilities();bindAnalytics();await track('page_view',{path:location.pathname})}
init().catch(()=>{});
