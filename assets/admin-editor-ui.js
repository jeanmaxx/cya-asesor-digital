import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.SUPABASE_CONFIG||{};
const supabase=createClient(cfg.url,cfg.publishableKey);
const $=id=>document.getElementById(id);

const SECTION_ORDER=['package','analytics','assets','identity','contact','tools','featured','services','appearance','publication'];
const SECTION_META={
  package:{title:'Paquete contratado',icon:'◆'},analytics:{title:'Analíticas',icon:'▥'},assets:{title:'Fotografía y logo',icon:'◉'},identity:{title:'Identidad',icon:'♙'},contact:{title:'Contacto',icon:'☎'},tools:{title:'Herramientas de Tarjeta',icon:'↗'},featured:{title:'Contenido Destacado',icon:'★'},services:{title:'Servicios',icon:'▦'},appearance:{title:'Apariencia',icon:'◐'},publication:{title:'Publicación',icon:'◎'}
};
const FEATURE_GROUPS=[
  {title:'Landing + contacto',features:['landing','contact'],desc:'Página pública profesional con accesos de contacto visibles desde cualquier navegador.'},
  {title:'QR + NFC',features:['nfc_qr'],desc:'Comparte la tarjeta mediante código QR, enlace o una tarjeta/etiqueta NFC programada con la misma URL.'},
  {title:'WhatsApp',features:['whatsapp'],desc:'Botones directos a WhatsApp con mensaje inicial personalizado para facilitar el primer contacto.'},
  {title:'Redes + ubicación',features:['social_links','map'],desc:'Enlaces a redes sociales y herramientas de ubicación o mapa cuando el tipo de tarjeta lo requiera.'},
  {title:'Panel de administración',features:['admin_panel'],desc:'Permite al cliente iniciar sesión y actualizar los datos autorizados de su propia tarjeta.'},
  {title:'Tema y apariencia',features:['theme'],desc:'Permite administrar modo claro/oscuro y opciones visuales disponibles para la tarjeta.'},
  {title:'Servicios + reseñas',features:['services','reviews'],desc:'Permite administrar servicios, textos comerciales y accesos orientados a reputación y reseñas.'},
  {title:'Galería + vCard',features:['gallery','vcard'],desc:'Muestra contenido visual y permite que el visitante guarde los datos del profesional o negocio como contacto.'},
  {title:'Agenda y citas',features:['booking'],desc:'Herramientas para solicitud o gestión de citas y horarios según el tipo de tarjeta.'},
  {title:'Analíticas',features:['analytics'],desc:'Mide vistas e interacciones como QR, WhatsApp, servicios consultados, compartir y guardar contacto.'},
  {title:'Automatización + leads',features:['automations','lead_capture'],desc:'Captura prospectos interesados y habilita acciones automáticas posteriores al contacto o a una cita.'},
  {title:'CRM + dominio + marca',features:['crm','custom_domain','white_label'],desc:'Integra seguimiento comercial, dominio propio y opciones avanzadas de personalización de marca.'}
];
let packages=[];
let accordions=new Map();
let initialized=false;

const normalize=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function sectionKey(fieldset){
  if(fieldset.id==='plan-fieldset')return'package';
  if(fieldset.id==='phase1-analytics-fieldset')return'analytics';
  if(fieldset.id==='phase1-tools-fieldset')return'tools';
  const text=normalize(fieldset.querySelector('legend')?.textContent);
  if(text.includes('fotografia'))return'assets';if(text==='identidad')return'identity';if(text==='contacto')return'contact';if(text.includes('contenido destacado'))return'featured';if(text==='servicios')return'services';if(text==='apariencia')return'appearance';if(text.includes('publicacion'))return'publication';return'';
}
function waitForPhase1(){return new Promise(resolve=>{const done=()=>document.getElementById('phase1-tools-fieldset')&&document.getElementById('phase1-analytics-fieldset');if(done())return resolve();let n=0;const t=setInterval(()=>{n++;if(done()||n>30){clearInterval(t);resolve()}},100)})}
async function loadPackages(){const {data}=await supabase.from('package_catalog').select('package_key,name,level,description,features').eq('is_active',true).order('level',{ascending:true});packages=data||[]}
function packageByKey(key){return packages.find(p=>p.package_key===key)||null}
function packageHasAll(pkg,features){const set=new Set(Array.isArray(pkg?.features)?pkg.features:[]);return features.every(f=>set.has(f))}
function minimumPackageForGroup(group){return packages.find(p=>packageHasAll(p,group.features))||packages[packages.length-1]||null}

function addEditorMeta(){const title=$('editor-account-name');if(!title||$('editor-account-meta'))return;const row=document.createElement('div');row.id='editor-account-meta';row.className='editor-account-meta';title.insertAdjacentElement('afterend',row)}
function buildAccordion(fieldset,key){if(!fieldset||accordions.has(key))return;const meta=SECTION_META[key];const details=document.createElement('details');details.className='editor-accordion';details.dataset.section=key;const summary=document.createElement('summary');summary.innerHTML=`<span class="accordion-icon" aria-hidden="true">${meta.icon}</span><span class="accordion-title-wrap"><span class="accordion-title">${meta.title}</span><span class="accordion-subtitle">Configuración</span></span><span class="accordion-state"><span class="accordion-dirty" title="Cambios sin guardar"></span><span class="accordion-plan-tag is-hidden"></span></span><span class="accordion-chevron" aria-hidden="true">⌄</span>`;const body=document.createElement('div');body.className='accordion-body';fieldset.parentNode.insertBefore(details,fieldset);details.append(summary,body);body.appendChild(fieldset);accordions.set(key,details);details.addEventListener('toggle',()=>{if(details.open&&matchMedia('(max-width:760px)').matches){accordions.forEach((other,k)=>{if(k!==key)other.open=false})}saveOpenState()})}
function reorderAccordions(){const form=$('profile-form'),save=form?.querySelector('.save-row');if(!form||!save)return;SECTION_ORDER.forEach(key=>{const d=accordions.get(key);if(d)form.insertBefore(d,save)})}
function stateKey(){return`cya-editor-open:${$('slug')?.value.trim()||'editor'}`}
function saveOpenState(){try{localStorage.setItem(stateKey(),JSON.stringify([...accordions].filter(([,d])=>d.open).map(([k])=>k)))}catch{}}
function restoreOpenState(){let saved=null;try{saved=JSON.parse(localStorage.getItem(stateKey())||'null')}catch{}const openKeys=Array.isArray(saved)?saved:['package'];accordions.forEach((d,k)=>d.open=openKeys.includes(k));if(matchMedia('(max-width:760px)').matches){let found=false;SECTION_ORDER.forEach(k=>{const d=accordions.get(k);if(d?.open){if(found)d.open=false;else found=true}})}}

function setSubtitle(key,text){const d=accordions.get(key);const el=d?.querySelector('.accordion-subtitle');if(el)el.textContent=text||'Configuración'}
function updateHeaderMeta(){const root=$('editor-account-meta');if(!root)return;const slug=$('slug')?.value.trim()||'sin-identificador',pkg=$('package-key'),status=$('is-published')?.checked;const plan=pkg?.options[pkg.selectedIndex]?.textContent||'Sin paquete';root.innerHTML=`<span class="editor-meta-chip">${escapeHtml(slug)}</span><span class="editor-meta-chip editor-meta-chip--plan">${escapeHtml(plan)}</span><span class="editor-meta-chip ${status?'editor-meta-chip--published':'editor-meta-chip--draft'}">${status?'● Publicada':'○ Borrador'}</span>`}
function updateSummaries(){
  const pkg=$('package-key'),stat=$('package-status');setSubtitle('package',`${pkg?.options[pkg.selectedIndex]?.textContent||'Paquete'} · ${stat?.options[stat.selectedIndex]?.textContent||''}`);
  const views=$('metric-views')?.textContent||'—',range=$('phase1-analytics-range')?.value||30;setSubtitle('analytics',accordions.get('analytics')?.classList.contains('is-section-locked')?'Disponible en Premium':`${range} días · ${views} vistas`);
  const photo=$('photo-preview')?.src||'',logo=$('logo-preview')?.src||'';setSubtitle('assets',`${photo.includes('profile-placeholder')?'Sin foto':'Foto configurada'} · ${logo.includes('logo-placeholder')?'Sin logo':'Logo configurado'}`);
  const full=`${$('first-names')?.value||''} ${$('last-names')?.value||''}`.trim(),title=$('title')?.value||'';setSubtitle('identity',full?`${full}${title?' · '+title:''}`:'Datos principales del perfil');
  const wa=$('whatsapp')?.value.trim(),phone=$('phone')?.value.trim();setSubtitle('contact',wa?'WhatsApp configurado':phone?'Teléfono configurado':'Sin teléfono configurado');
  const qr=!$('phase1-download-qr')?.disabled,vc=!$('phase1-download-vcard')?.disabled;setSubtitle('tools',[qr?'QR':'',vc?'vCard':'','Compartir'].filter(Boolean).join(' · '));
  const labels=[$('trust-item-1')?.value,$('trust-item-2')?.value,$('trust-item-3')?.value].filter(v=>String(v||'').trim()).length;setSubtitle('featured',`${labels} etiquetas · CTA final`);
  const svc=[...document.querySelectorAll('.service-editor-card')],visible=svc.filter(c=>c.querySelector('.service-visible')?.checked).length;setSubtitle('services',`${visible} de ${svc.length} servicios activos`);
  const font=$('font-family'),theme=$('theme-mode');setSubtitle('appearance',`${font?.options[font.selectedIndex]?.textContent||'Tipografía'} · ${theme?.options[theme.selectedIndex]?.textContent||'Tema'}`);
  setSubtitle('publication',$('is-published')?.checked?'Publicada y visible':'Borrador / no publicada');updateHeaderMeta()
}

function renderPackageCatalog(){const select=$('package-key'),root=$('package-features');if(!select||!root||!packages.length)return;const selected=packageByKey(select.value)||packages[0];root.className='package-catalog';root.replaceChildren();FEATURE_GROUPS.forEach(group=>{const min=minimumPackageForGroup(group);if(!min)return;const yes=packageHasAll(selected,group.features);const row=document.createElement('div');row.className=`package-feature-row ${yes?'is-included':'is-locked'}`;row.tabIndex=0;row.innerHTML=`<span class="package-feature-symbol">${yes?'✓':'⌁'}</span><span class="package-feature-copy"><strong>${escapeHtml(group.title)}</strong><span>${yes?'Incluido en tu selección':`Disponible desde ${min.name}`}</span></span><span class="package-tier-pill">${yes?'Incluido':min.name}</span><button class="feature-info-btn" type="button" aria-label="Información sobre ${escapeHtml(group.title)}">i</button><span class="feature-tooltip" role="tooltip">${escapeHtml(group.desc)}</span>`;row.querySelector('.feature-info-btn').addEventListener('click',e=>{e.stopPropagation();document.querySelectorAll('.package-feature-row.is-tooltip-open').forEach(x=>{if(x!==row)x.classList.remove('is-tooltip-open')});row.classList.toggle('is-tooltip-open')});root.appendChild(row)});const note=document.createElement('p');note.className='package-upsell-note';note.textContent=selected.package_key==='premium'?'Premium incluye actualmente todas las capacidades disponibles del catálogo.':`Las tarjetas atenuadas pertenecen a niveles superiores. Pasa el cursor sobre ⓘ o tócala desde el teléfono para conocer qué incluye cada capacidad.`;root.appendChild(note);$('package-description').textContent=selected.description||'';const isAdmin=$('admin-role-badge')?.textContent==='Administrador principal';$('package-permission-note').textContent=isAdmin?'Como administrador principal puedes cambiar el paquete. La nueva selección se aplica al guardar la tarjeta.':'Tu paquete es informativo. Solo el administrador principal puede modificarlo.';updateSummaries()}
function setAnalyticsLock(){const d=accordions.get('analytics'),select=$('package-key');if(!d||!select)return;const selected=packageByKey(select.value),hasAnalytics=Array.isArray(selected?.features)&&selected.features.includes('analytics');const fs=$('phase1-analytics-fieldset');if(fs)fs.classList.remove('is-hidden');let preview=fs?.querySelector('.plan-lock-preview');if(fs&&!preview){preview=document.createElement('div');preview.className='plan-lock-preview';preview.innerHTML='<strong>Analíticas avanzadas · Premium</strong><span>Mide vistas, QR, WhatsApp, compartir, vCard y servicios de mayor interés.</span>';fs.prepend(preview)}d.classList.toggle('is-section-locked',!hasAnalytics);const tag=d.querySelector('.accordion-plan-tag');if(tag){tag.textContent=hasAnalytics?'':'Premium';tag.classList.toggle('is-hidden',hasAnalytics)}updateSummaries()}

function markDirty(target){if(target?.closest('#phase1-analytics-fieldset'))return;const form=$('profile-form');if(!form)return;form.classList.add('has-unsaved');const d=target?.closest('.editor-accordion');if(d)d.classList.add('is-dirty');updateSummaries()}
function clearDirty(){const form=$('profile-form');form?.classList.remove('has-unsaved');accordions.forEach(d=>d.classList.remove('is-dirty'))}
function bindDirty(){const form=$('profile-form');if(!form)return;form.addEventListener('input',e=>markDirty(e.target),true);form.addEventListener('change',e=>markDirty(e.target),true);const msg=$('save-message');if(msg)new MutationObserver(()=>{if(msg.classList.contains('is-success')&&/guardad/i.test(msg.textContent||'')){clearDirty();updateSummaries()}}).observe(msg,{childList:true,characterData:true,subtree:true,attributes:true})}
function bindPackage(){const select=$('package-key');if(!select)return;select.addEventListener('change',()=>{renderPackageCatalog();setAnalyticsLock();markDirty(select)});$('package-status')?.addEventListener('change',updateSummaries);document.addEventListener('click',e=>{if(!e.target.closest('.package-feature-row'))document.querySelectorAll('.package-feature-row.is-tooltip-open').forEach(x=>x.classList.remove('is-tooltip-open'))})}
function watchEditor(){const editor=$('editor-panel');if(!editor)return;new MutationObserver(()=>{if(!editor.classList.contains('is-hidden'))setTimeout(()=>{clearDirty();renderPackageCatalog();setAnalyticsLock();updateSummaries();restoreOpenState()},280)}).observe(editor,{attributes:true,attributeFilter:['class']});const services=$('services-editor');if(services)new MutationObserver(()=>setTimeout(updateSummaries,30)).observe(services,{childList:true,subtree:true});['metric-views','metric-sessions','metric-whatsapp'].forEach(id=>{const el=$(id);if(el)new MutationObserver(updateSummaries).observe(el,{childList:true,characterData:true,subtree:true})})}
function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}

async function init(){if(initialized)return;initialized=true;await waitForPhase1();await loadPackages();addEditorMeta();const form=$('profile-form');if(!form)return;[...form.querySelectorAll(':scope > fieldset')].forEach(fs=>{const key=sectionKey(fs);if(key)buildAccordion(fs,key)});reorderAccordions();form.classList.add('editor-accordion-form');bindPackage();bindDirty();watchEditor();renderPackageCatalog();setAnalyticsLock();updateSummaries();restoreOpenState()}
window.addEventListener('load',init);
