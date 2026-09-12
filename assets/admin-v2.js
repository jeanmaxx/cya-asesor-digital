import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SUPABASE_CONFIG || {};
const $ = (id) => document.getElementById(id);
const supabase = createClient(cfg.url, cfg.publishableKey);

let authMode = 'login';
let currentUser = null;
let currentProfile = null;
let currentServices = [];
let currentSubscription = null;
let accounts = [];
let platformRole = 'client';
let packages = [];
let subscriptions = new Map();

const FEATURE_LABELS = {
  landing: 'Landing pública', nfc_qr: 'NFC y QR', whatsapp: 'WhatsApp', social_links: 'Redes sociales',
  map: 'Mapa / ubicación', contact: 'Contacto', admin_panel: 'Panel de administración', theme: 'Modo claro/oscuro',
  services: 'Servicios', reviews: 'Reseñas', gallery: 'Galería', vcard: 'Guardar contacto / vCard',
  booking: 'Agenda y citas', analytics: 'Analíticas', custom_domain: 'Dominio propio', automations: 'Automatizaciones',
  wallet: 'Apple / Google Wallet', lead_capture: 'Captura de leads', crm: 'Integración CRM', white_label: 'White-label'
};

function isSuperAdmin(){ return platformRole === 'super_admin'; }
function systemAdminTheme(){return window.matchMedia?.('(prefers-color-scheme: dark)').matches?'dark':'light'}
function setAdminTheme(theme,persist=false){const t=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=t;$('admin-theme-icon').textContent=t==='dark'?'☀':'☾';$('admin-theme-toggle').setAttribute('aria-label',t==='dark'?'Cambiar a modo claro':'Cambiar a modo oscuro');if(persist)localStorage.setItem('cya-admin-theme',t)}
setAdminTheme(localStorage.getItem('cya-admin-theme')||systemAdminTheme());
$('admin-theme-toggle').addEventListener('click',()=>setAdminTheme((document.documentElement.dataset.theme||'light')==='dark'?'light':'dark',true));

function setMessage(id,text='',type=''){const el=$(id);if(!el)return;el.textContent=text;el.classList.toggle('is-error',type==='error');el.classList.toggle('is-success',type==='success')}
function setAuthMode(mode){authMode=mode;$('tab-login').classList.toggle('is-active',mode==='login');$('tab-signup').classList.toggle('is-active',mode==='signup');$('auth-submit').textContent=mode==='login'?'Ingresar':'Crear acceso';$('auth-password').autocomplete=mode==='login'?'current-password':'new-password';setMessage('auth-message')}
$('tab-login').addEventListener('click',()=>setAuthMode('login'));
$('tab-signup').addEventListener('click',()=>setAuthMode('signup'));
$('auth-form').addEventListener('submit',async e=>{e.preventDefault();setMessage('auth-message','Procesando…');try{const email=$('auth-email').value.trim(),password=$('auth-password').value;if(authMode==='signup'){const {data,error}=await supabase.auth.signUp({email,password});if(error)throw error;if(!data.session){setMessage('auth-message','Acceso creado. Revisa tu correo para confirmar la cuenta. Un administrador deberá asignarte una tarjeta antes de que aparezca en tu panel.','success');return}}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}await bootAuthenticated()}catch(err){setMessage('auth-message',err.message||'No fue posible completar el acceso.','error')}});

async function signOut(){await supabase.auth.signOut();currentUser=null;currentProfile=null;currentServices=[];currentSubscription=null;$('hub-panel').classList.add('is-hidden');$('editor-panel').classList.add('is-hidden');$('global-signout').classList.add('is-hidden');$('auth-panel').classList.remove('is-hidden');setMessage('auth-message','Sesión cerrada.','success')}
$('global-signout').addEventListener('click',signOut);

function storagePublicUrl(path){return path?`${cfg.url}/storage/v1/object/public/${cfg.storageBucket}/${path}`:''}
function slugify(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-{2,}/g,'-')}
function escapeText(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function publicUrl(profile){return profile.is_demo?'../':`../?asesor=${encodeURIComponent(profile.slug)}`}
function packageByKey(key){return packages.find(p=>p.package_key===key)||null}

async function loadPlatformContext(){
  const [{data:roleRow},{data:pkgRows,error:pkgError}] = await Promise.all([
    supabase.from('platform_users').select('platform_role,display_name').eq('user_id',currentUser.id).maybeSingle(),
    supabase.from('package_catalog').select('*').eq('is_active',true).order('level',{ascending:true})
  ]);
  if(pkgError) throw pkgError;
  platformRole = roleRow?.platform_role || 'client';
  packages = pkgRows || [];
  applyRoleUi();
}

function applyRoleUi(){
  const superAdmin=isSuperAdmin();
  $('new-account')?.classList.toggle('is-hidden',!superAdmin);
  $('backups-panel')?.classList.toggle('is-hidden',!superAdmin);
  $('admin-role-badge')?.classList.remove('is-hidden');
  if($('admin-role-badge')) $('admin-role-badge').textContent=superAdmin?'Administrador principal':'Cuenta administrada';
}

async function loadSubscriptions(){
  subscriptions = new Map();
  const ids=accounts.map(a=>a.id);
  if(!ids.length) return;
  const {data,error}=await supabase.from('account_subscriptions').select('*').eq('account_type','advisor').in('account_id',ids);
  if(error) throw error;
  (data||[]).forEach(s=>subscriptions.set(s.account_id,s));
}

async function loadAccounts(){
  const {data,error}=await supabase.from('advisor_profiles').select('*').eq('product_type','advisor').order('is_demo',{ascending:true}).order('created_at',{ascending:true});
  if(error)throw error;
  accounts=data||[];
  await loadSubscriptions();
  renderAccounts();
}

function renderAccounts(){
  const root=$('accounts-list');root.replaceChildren();
  if(!accounts.length){root.innerHTML='<div class="empty-state">No tienes tarjetas asignadas. Si acabas de crear tu acceso, solicita al administrador principal que vincule tu cuenta.</div>';return}
  accounts.forEach(p=>{
    const card=document.createElement('article');card.className='account-card';
    const full=`${p.first_names||''} ${p.last_names||''}`.trim()||'Sin nombre';
    const sub=subscriptions.get(p.id); const pkg=packageByKey(sub?.package_key);
    card.innerHTML=`<div class="account-card__top"><div><div class="account-avatar">${escapeText((p.first_names||'?').slice(0,1))}</div></div><div class="account-card__identity"><strong>${escapeText(full)}</strong><span>${escapeText(p.title||'Asesor Previsional')}</span></div></div><div class="account-badges">${p.is_demo?'<span class="badge badge--demo">Demo pública</span>':''}<span class="badge badge--plan">${escapeText(pkg?.name||'Sin paquete')}</span><span class="badge ${p.is_published?'badge--on':'badge--off'}">${p.is_published?'Publicada':'Borrador'}</span></div><code>${escapeText(p.slug)}</code><div class="account-actions"><button class="primary-btn edit-account" type="button">Editar</button><a class="secondary-link" href="${publicUrl(p)}" target="_blank" rel="noopener">Ver ↗</a></div>`;
    card.querySelector('.edit-account').addEventListener('click',()=>openEditor(p.id));root.appendChild(card)
  })
}

$('new-account').addEventListener('click',async()=>{if(!isSuperAdmin())return;setMessage('accounts-message','Creando nueva tarjeta…');$('new-account').disabled=true;try{const {data,error}=await supabase.rpc('create_advisor_account');if(error)throw error;await createAutomaticBackup();await loadAccounts();setMessage('accounts-message','Nueva tarjeta creada en paquete Básico. Puedes personalizarla ahora.','success');await openEditor(data)}catch(err){setMessage('accounts-message',err.message||'No fue posible crear la tarjeta.','error')}finally{$('new-account').disabled=false}});

async function loadCurrentSubscription(){
  const {data,error}=await supabase.from('account_subscriptions').select('*').eq('account_type','advisor').eq('account_id',currentProfile.id).maybeSingle();
  if(error)throw error;
  currentSubscription=data;
  renderPlanSection();
}

function renderPlanSection(){
  const select=$('package-key'),status=$('package-status'),desc=$('package-description'),features=$('package-features'),note=$('package-permission-note');
  select.replaceChildren();
  packages.forEach(pkg=>{const opt=document.createElement('option');opt.value=pkg.package_key;opt.textContent=pkg.name;select.appendChild(opt)});
  const key=currentSubscription?.package_key||'basic'; select.value=key; status.value=currentSubscription?.status||'active';
  const editable=isSuperAdmin(); select.disabled=!editable; status.disabled=!editable;
  const pkg=packageByKey(key); desc.textContent=pkg?.description||''; features.replaceChildren();
  (Array.isArray(pkg?.features)?pkg.features:[]).forEach(f=>{const chip=document.createElement('span');chip.className='feature-chip';chip.textContent=FEATURE_LABELS[f]||f;features.appendChild(chip)});
  note.textContent=editable?'Como administrador principal puedes cambiar el paquete y su estado.':'Tu paquete es informativo. Solo el administrador principal puede modificarlo.';
}
$('package-key')?.addEventListener('change',renderPlanSection);

async function savePlan(){
  if(!isSuperAdmin()||!currentProfile)return;
  const payload={account_type:'advisor',account_id:currentProfile.id,package_key:$('package-key').value,status:$('package-status').value,updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('account_subscriptions').upsert(payload,{onConflict:'account_type,account_id'}).select('*').single();
  if(error)throw error; currentSubscription=data;
}

async function openEditor(id){
  setMessage('save-message','Cargando…');
  const {data,error}=await supabase.from('advisor_profiles').select('*').eq('id',id).single();
  if(error)throw error;
  currentProfile=data; fillForm(data);
  await Promise.all([loadOwnServices(),loadCurrentSubscription()]);
  $('hub-panel').classList.add('is-hidden');$('editor-panel').classList.remove('is-hidden');window.scrollTo({top:0,behavior:'smooth'});setMessage('save-message')
}
function showHub(){currentProfile=null;currentServices=[];currentSubscription=null;$('editor-panel').classList.add('is-hidden');$('hub-panel').classList.remove('is-hidden');loadAccounts();if(isSuperAdmin()){loadBackupPreferences();loadBackups()}window.scrollTo({top:0,behavior:'smooth'})}
$('back-to-accounts').addEventListener('click',showHub);$('cancel-edit').addEventListener('click',showHub);

function fillForm(p){$('editor-account-name').textContent=`${p.first_names||''} ${p.last_names||''}`.trim()||'Configuración';$('first-names').value=p.first_names||'';$('last-names').value=p.last_names||'';$('page-title').value=p.page_title||'';$('title').value=p.title||'Asesor Previsional';$('company-name').value=p.company_name||'Casillas & Asociados';$('ally-label').value=p.ally_label||'Asesor Aliado';$('bio').value=p.bio||'';$('slug').value=p.slug||'';$('phone').value=p.phone||'';$('whatsapp').value=p.whatsapp||'';$('whatsapp-message').value=p.whatsapp_message||`Hola ${(p.first_names||'').split(' ')[0]||'asesor'}, vi tu tarjeta digital y me gustaría recibir asesoría previsional.`;$('instagram').value=p.instagram_url||'';$('facebook').value=p.facebook_url||'';$('primary-color').value=p.primary_color||'#0E223D';$('accent-color').value=p.accent_color||'#C9A96E';$('background-color').value=p.background_color||'#F7F5F0';$('surface-color').value=p.surface_color||'#FFFFFF';$('font-family').value=p.font_family||'helvetica';$('theme-mode').value=p.theme_mode||'system';const t=Array.isArray(p.trust_items)?p.trust_items:['Atención personalizada','Acompañamiento','Información clara'];$('trust-item-1').value=t[0]||'';$('trust-item-2').value=t[1]||'';$('trust-item-3').value=t[2]||'';$('closing-kicker-input').value=p.closing_kicker||'Orientación inicial';$('closing-title-input').value=p.closing_title||'Cuéntame tu caso';$('closing-text-input').value=p.closing_text||'';$('closing-cta-input').value=p.closing_cta||'Escribirme por WhatsApp';$('is-published').checked=!!p.is_published;$('photo-preview').src=p.photo_path?storagePublicUrl(p.photo_path):'../assets/profile-placeholder.svg';$('logo-preview').src=p.logo_path?storagePublicUrl(p.logo_path):'../assets/logo-placeholder.svg';updatePreviewLink()}
function updatePreviewLink(){if(currentProfile)$('profile-preview-link').href=currentProfile.is_demo?'../':`../?asesor=${encodeURIComponent($('slug').value.trim()||currentProfile.slug)}`}
$('slug').addEventListener('input',updatePreviewLink);['first-names','last-names'].forEach(id=>$(id).addEventListener('blur',()=>{if($('slug').value.trim())return;const s=slugify(`${$('first-names').value} ${$('last-names').value}`);if(s){$('slug').value=s;updatePreviewLink()}}));

async function loadOwnServices(){const {data,error}=await supabase.from('advisor_services').select('*').eq('advisor_id',currentProfile.id).order('sort_order',{ascending:true});if(error)throw error;currentServices=data||[];renderServicesEditor(currentServices)}
function renderServicesEditor(services){const root=$('services-editor');root.replaceChildren();services.forEach((s,i)=>{const card=document.createElement('section');card.className='service-editor-card';card.dataset.id=s.id;const req=Array.isArray(s.requirements)?s.requirements.join('\n'):'';card.innerHTML=`<div class="service-editor-card__header"><strong>Servicio ${i+1}</strong><label class="mini-switch"><input class="service-visible" type="checkbox" ${s.is_visible!==false?'checked':''}/> Visible</label></div><label>Título<input class="service-title" type="text" maxlength="140" value="${escapeText(s.title)}" /></label><label>Descripción breve<textarea class="service-summary" rows="3" maxlength="320">${escapeText(s.summary)}</textarea></label><label>Requisitos / puntos básicos<textarea class="service-requirements" rows="5">${escapeText(req)}</textarea></label><label>Nota adicional<textarea class="service-notice" rows="2" maxlength="320">${escapeText(s.notice||'')}</textarea></label><label>Texto del botón<input class="service-cta-input" type="text" maxlength="100" value="${escapeText(s.cta||'Quiero recibir información')}" /></label>`;root.appendChild(card)})}
async function saveServices(){for(const card of document.querySelectorAll('.service-editor-card')){const payload={title:card.querySelector('.service-title').value.trim(),summary:card.querySelector('.service-summary').value.trim(),requirements:card.querySelector('.service-requirements').value.split('\n').map(x=>x.trim()).filter(Boolean),notice:card.querySelector('.service-notice').value.trim()||null,cta:card.querySelector('.service-cta-input').value.trim()||'Quiero recibir información',is_visible:card.querySelector('.service-visible').checked};const {error}=await supabase.from('advisor_services').update(payload).eq('id',card.dataset.id).eq('advisor_id',currentProfile.id);if(error)throw error}}

$('photo-file').addEventListener('change',e=>previewLocalFile(e.target.files?.[0],$('photo-preview')));$('logo-file').addEventListener('change',e=>previewLocalFile(e.target.files?.[0],$('logo-preview')));
function previewLocalFile(file,img){if(!file)return;const url=URL.createObjectURL(file);img.src=url;img.onload=()=>URL.revokeObjectURL(url)}
function fileExtension(file){const ext=file.name.split('.').pop()?.toLowerCase();if(ext&&/^[a-z0-9]+$/.test(ext))return ext;return {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/svg+xml':'svg'}[file.type]||'bin'}
async function uploadAsset(file,kind){if(!file)return null;if(file.size>5*1024*1024)throw new Error('Cada imagen debe pesar menos de 5 MB.');const path=`${currentUser.id}/${currentProfile.id}/${kind}-${Date.now()}.${fileExtension(file)}`;const {error}=await supabase.storage.from(cfg.storageBucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(error)throw error;return path}

$('profile-form').addEventListener('submit',async e=>{e.preventDefault();setMessage('save-message','Guardando cambios…');$('save-profile').disabled=true;try{const first=$('first-names').value.trim(),last=$('last-names').value.trim(),slug=$('slug').value.trim()||slugify(`${first} ${last}`);if(!slug)throw new Error('Define un identificador válido.');const photoPath=await uploadAsset($('photo-file').files?.[0],'profile'),logoPath=await uploadAsset($('logo-file').files?.[0],'logo');const payload={slug,first_names:first,last_names:last,page_title:$('page-title').value.trim()||null,title:$('title').value.trim(),company_name:$('company-name').value.trim(),ally_label:$('ally-label').value.trim()||'Asesor Aliado',phone:$('phone').value.trim(),whatsapp:$('whatsapp').value.trim(),whatsapp_message:$('whatsapp-message').value.trim()||null,instagram_url:$('instagram').value.trim()||null,facebook_url:$('facebook').value.trim()||null,bio:$('bio').value.trim()||null,primary_color:$('primary-color').value,accent_color:$('accent-color').value,background_color:$('background-color').value,surface_color:$('surface-color').value,font_family:$('font-family').value,theme_mode:$('theme-mode').value,trust_items:[$('trust-item-1').value.trim(),$('trust-item-2').value.trim(),$('trust-item-3').value.trim()].filter(Boolean),closing_kicker:$('closing-kicker-input').value.trim()||'Orientación inicial',closing_title:$('closing-title-input').value.trim()||'Cuéntame tu caso',closing_text:$('closing-text-input').value.trim(),closing_cta:$('closing-cta-input').value.trim()||'Escribirme por WhatsApp',is_published:$('is-published').checked,...(photoPath?{photo_path:photoPath}:{}),...(logoPath?{logo_path:logoPath}:{})};const {data,error}=await supabase.from('advisor_profiles').update(payload).eq('id',currentProfile.id).select('*').single();if(error)throw error;currentProfile=data;await saveServices();await savePlan();if(isSuperAdmin())await createAutomaticBackup();fillForm(data);await Promise.all([loadOwnServices(),loadCurrentSubscription()]);$('photo-file').value='';$('logo-file').value='';setMessage('save-message',isSuperAdmin()?'Cambios guardados y respaldo automático procesado.':'Cambios guardados.','success')}catch(err){setMessage('save-message',err.message||'No fue posible guardar.','error')}finally{$('save-profile').disabled=false}});

async function ensureBackupPrefs(){if(!isSuperAdmin())return;await supabase.from('backup_preferences').upsert({user_id:currentUser.id},{onConflict:'user_id'})}
async function loadBackupPreferences(){if(!isSuperAdmin())return;try{await ensureBackupPrefs();const {data,error}=await supabase.from('backup_preferences').select('*').eq('user_id',currentUser.id).single();if(error)throw error;$('automatic-backups').checked=!!data.automatic_enabled;$('backup-keep-count').value=String(data.keep_count||30)}catch(err){setMessage('backup-message',err.message||'No fue posible cargar la configuración de respaldos.','error')}}
async function saveBackupPreferences(){if(!isSuperAdmin())return;const {error}=await supabase.from('backup_preferences').upsert({user_id:currentUser.id,automatic_enabled:$('automatic-backups').checked,keep_count:Number($('backup-keep-count').value),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;setMessage('backup-message','Preferencias de respaldo actualizadas.','success')}
$('automatic-backups').addEventListener('change',()=>saveBackupPreferences().catch(err=>setMessage('backup-message',err.message,'error')));$('backup-keep-count').addEventListener('change',()=>saveBackupPreferences().catch(err=>setMessage('backup-message',err.message,'error')));
async function createAutomaticBackup(){if(!isSuperAdmin())return;const {error}=await supabase.rpc('create_platform_backup',{p_backup_type:'automatic'});if(error)throw error}
$('manual-backup').addEventListener('click',async()=>{if(!isSuperAdmin())return;setMessage('backup-message','Creando respaldo…');$('manual-backup').disabled=true;try{const {error}=await supabase.rpc('create_platform_backup',{p_backup_type:'manual'});if(error)throw error;await loadBackups();setMessage('backup-message','Respaldo manual creado correctamente.','success')}catch(err){setMessage('backup-message',err.message||'No fue posible crear el respaldo.','error')}finally{$('manual-backup').disabled=false}});$('refresh-backups').addEventListener('click',()=>isSuperAdmin()&&loadBackups());
async function loadBackups(){if(!isSuperAdmin())return;const {data,error}=await supabase.from('platform_backups').select('id,backup_type,snapshot,created_at').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(10);if(error){setMessage('backup-message',error.message,'error');return}renderBackups(data||[])}
function renderBackups(items){const root=$('backups-list');root.replaceChildren();if(!items.length){root.innerHTML='<div class="empty-state compact">Aún no hay respaldos.</div>';return}items.forEach(b=>{const row=document.createElement('div');row.className='backup-row';const advisors=Array.isArray(b.snapshot?.advisor_profiles)?b.snapshot.advisor_profiles.length:0,businesses=Array.isArray(b.snapshot?.business_profiles)?b.snapshot.business_profiles.length:0,count=advisors+businesses;const when=new Date(b.created_at).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});row.innerHTML=`<div><strong>${b.backup_type==='automatic'?'Automático':'Manual'}</strong><span>${escapeText(when)} · ${count} cuenta${count===1?'':'s'}</span></div><button class="text-btn download-backup" type="button">Descargar JSON</button>`;row.querySelector('.download-backup').addEventListener('click',()=>downloadBackup(b));root.appendChild(row)})}
function downloadBackup(b){const blob=new Blob([JSON.stringify(b.snapshot,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`cya-respaldo-${new Date(b.created_at).toISOString().replace(/[:.]/g,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

async function bootAuthenticated(){const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return;currentUser=user;await loadPlatformContext();$('auth-panel').classList.add('is-hidden');$('global-signout').classList.remove('is-hidden');$('hub-panel').classList.remove('is-hidden');$('editor-panel').classList.add('is-hidden');try{if(isSuperAdmin())await Promise.all([loadAccounts(),loadBackupPreferences(),loadBackups()]);else await loadAccounts()}catch(err){setMessage('accounts-message',err.message||'No fue posible cargar el panel.','error')}}
(async()=>{const {data:{session}}=await supabase.auth.getSession();if(session)await bootAuthenticated()})();