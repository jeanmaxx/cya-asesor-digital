import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.SUPABASE_CONFIG||{};
const supabase=createClient(cfg.url,cfg.publishableKey);
const $=id=>document.getElementById(id);
const storageUrl=p=>p?`${cfg.url}/storage/v1/object/public/${cfg.storageBucket}/${p}`:'';

const state={kind:'',table:'',form:null,id:'',profile:null,pending:{main:null,icon:null,dark:null,photo:null},urls:new Map(),lastSlug:''};
const defaults={preset:'personal',show_logo:true,show_photo:true,logo_size:'medium',photo_size:'large',logo_shape:'none',photo_shape:'circle',logo_fit:'contain',photo_fit:'cover',logo_position:'stacked',logo_asset:'main'};
const presets={
  personal:{show_logo:true,show_photo:true,logo_size:'medium',photo_size:'large',logo_shape:'none',photo_shape:'circle',logo_fit:'contain',photo_fit:'cover',logo_position:'stacked'},
  corporate:{show_logo:true,show_photo:false,logo_size:'large',photo_size:'medium',logo_shape:'none',photo_shape:'circle',logo_fit:'contain',photo_fit:'cover',logo_position:'distributed'},
  mixed:{show_logo:true,show_photo:true,logo_size:'medium',photo_size:'medium',logo_shape:'none',photo_shape:'circle',logo_fit:'contain',photo_fit:'cover',logo_position:'grouped_left'},
  minimal:{show_logo:false,show_photo:false,logo_size:'small',photo_size:'small',logo_shape:'none',photo_shape:'circle',logo_fit:'contain',photo_fit:'cover',logo_position:'stacked'}
};

function detect(){
  if($('profile-form')){state.kind='advisor';state.table='advisor_profiles';state.form=$('profile-form');return true}
  if($('business-form')){state.kind='business';state.table='business_profiles';state.form=$('business-form');state.id=new URLSearchParams(location.search).get('id')||'';return true}
  if($('other-form')){state.kind='other';state.table='business_profiles';state.form=$('other-form');state.id=new URLSearchParams(location.search).get('id')||'';return true}
  return false;
}
function legacyIds(){return state.kind==='advisor'?{logo:'logo-file',photo:'photo-file'}:state.kind==='business'?{logo:'b-logo-file',photo:''}:{logo:'o-logo-file',photo:''}}
function normalizeLayout(v){return v==='distributed'||v==='grouped_left'||v==='stacked'?v:v==='left'?'grouped_left':'stacked'}
function normalizeCfg(c={}){return{...defaults,...c,logo_position:normalizeLayout(c.logo_position)}}
function option(v,t){return`<option value="${v}">${t}</option>`}
function assetFieldset(){const ids=legacyIds();return $(ids.logo)?.closest('fieldset')||$(ids.photo)?.closest('fieldset')||null}
function assetPath(key){if(!state.profile)return'';return key==='main'?state.profile.logo_path:key==='icon'?state.profile.logo_icon_path:key==='dark'?state.profile.logo_dark_path:state.profile.photo_path}
function assetSource(key){const f=state.pending[key];if(f){if(!state.urls.has(key))state.urls.set(key,URL.createObjectURL(f));return state.urls.get(key)}if(key==='main'&&state.kind!=='advisor'&&!state.profile?.logo_path&&state.profile?.logo_data_url)return state.profile.logo_data_url;return storageUrl(assetPath(key))}
function revoke(key){const u=state.urls.get(key);if(u)URL.revokeObjectURL(u);state.urls.delete(key)}
function setPending(key,file){revoke(key);state.pending[key]=file||null;if(file)state.urls.set(key,URL.createObjectURL(file))}

function inject(){
  const fs=assetFieldset();if(!fs||fs.querySelector('.vi-v4-panel'))return;
  fs.querySelectorAll('.asset-grid').forEach(el=>el.classList.add('vi-v4-legacy-hidden'));
  const details=fs.closest('.editor-accordion');if(details){const t=details.querySelector('.accordion-title');if(t)t.textContent='Identidad visual';const s=details.querySelector('.accordion-subtitle');if(s)s.textContent='Logo, fotografía y composición del encabezado'}
  const p=document.createElement('div');p.className='vi-v4-panel';p.innerHTML=`
    <div class="vi-v4-assets">
      <article class="vi-v4-asset-card" data-asset-card="logo">
        <div class="vi-v4-card-head"><div><strong>Logotipo</strong><small>Imagen principal de la marca</small></div><label class="vi-v4-show"><input id="vi4-show-logo" type="checkbox"> Mostrar</label></div>
        <div class="vi-v4-square"><img id="vi4-logo-img" alt="Logotipo"><span id="vi4-logo-empty">Sin imagen</span></div>
        <div class="vi-v4-logo-choice"><label>Mostrar en encabezado<select id="vi4-logo-asset">${option('main','Logo principal')}${option('icon','Isotipo / icono')}</select></label></div>
        <div class="vi-v4-actions"><button type="button" class="vi-v4-change" data-change="selected-logo">Cambiar</button><button type="button" class="vi-v4-delete" data-delete="selected-logo">Eliminar</button></div>
        <small id="vi4-logo-meta" class="vi-v4-meta"></small>
      </article>
      <article class="vi-v4-asset-card" data-asset-card="photo">
        <div class="vi-v4-card-head"><div><strong>Fotografía / perfil</strong><small>Imagen personal o del negocio</small></div><label class="vi-v4-show"><input id="vi4-show-photo" type="checkbox"> Mostrar</label></div>
        <div class="vi-v4-square"><img id="vi4-photo-img" alt="Fotografía"><span id="vi4-photo-empty">Sin imagen</span></div>
        <div class="vi-v4-actions"><button type="button" class="vi-v4-change" data-change="photo">Cambiar</button><button type="button" class="vi-v4-delete" data-delete="photo">Eliminar</button></div>
        <small id="vi4-photo-meta" class="vi-v4-meta"></small>
      </article>
    </div>

    <input id="vi4-main-file" class="vi-v4-hidden-input" type="file" accept="image/png">
    <input id="vi4-icon-file" class="vi-v4-hidden-input" type="file" accept="image/png">
    <input id="vi4-dark-file" class="vi-v4-hidden-input" type="file" accept="image/png">
    <input id="vi4-photo-file" class="vi-v4-hidden-input" type="file" accept="image/jpeg,image/png,image/webp">

    <section class="vi-v4-config">
      <div><strong>Composición del encabezado</strong><p class="hint">En escritorio puedes distribuir, agrupar o apilar la identidad. En móvil la composición se adapta automáticamente para conservar legibilidad.</p></div>
      <div class="vi-v4-grid vi-v4-grid--2">
        <label>Preset<select id="vi4-preset">${option('personal','Personal')}${option('corporate','Corporativo')}${option('mixed','Mixto')}${option('minimal','Minimalista')}${option('custom','Personalizado')}</select></label>
        <label>Composición<select id="vi4-layout">${option('distributed','Distribuido')}${option('grouped_left','Agrupado a la izquierda')}${option('stacked','Apilado centrado')}</select></label>
      </div>
      <div class="vi-v4-grid vi-v4-grid--3">
        <label>Tamaño del logo<select id="vi4-logo-size">${option('small','Chico')}${option('medium','Mediano')}${option('large','Grande')}</select></label>
        <label>Forma del logo<select id="vi4-logo-shape">${option('none','Sin contenedor')}${option('circle','Circular')}${option('rounded','Cuadrado redondeado')}</select></label>
        <label>Ajuste del logo<select id="vi4-logo-fit">${option('contain','Mostrar completo')}${option('cover','Rellenar contenedor')}</select></label>
        <label>Tamaño de fotografía<select id="vi4-photo-size">${option('small','Chica')}${option('medium','Mediana')}${option('large','Grande')}</select></label>
        <label>Forma de fotografía<select id="vi4-photo-shape">${option('circle','Circular')}${option('rounded','Cuadrada redondeada')}</select></label>
        <label>Ajuste de fotografía<select id="vi4-photo-fit">${option('cover','Rellenar contenedor')}${option('contain','Mostrar completa')}</select></label>
      </div>
    </section>

    <section class="vi-v4-variants">
      <div class="vi-v4-variant"><div class="vi-v4-variant-thumb"><img id="vi4-light-img" alt="Logo modo claro"><span id="vi4-light-empty">Sin logo</span></div><div><strong>Logo modo claro</strong><small>Es el logo principal.</small><div class="vi-v4-mini-actions"><button type="button" data-change="main">Cambiar</button><button type="button" data-delete="main">Eliminar</button></div></div></div>
      <div class="vi-v4-variant"><div class="vi-v4-variant-thumb vi-v4-variant-thumb--dark"><img id="vi4-dark-img" alt="Logo modo oscuro"><span id="vi4-dark-empty">Usará el principal</span></div><div><strong>Logo modo oscuro</strong><small>Opcional; sustituye al principal en fondo oscuro.</small><div class="vi-v4-mini-actions"><button type="button" data-change="dark">Cambiar</button><button type="button" data-delete="dark">Eliminar</button></div></div></div>
    </section>
    <p id="vi4-status" class="vi-v4-status" aria-live="polite"></p>
  `;
  fs.appendChild(p);
  bind();
}

function cfgNow(){return{preset:$('vi4-preset')?.value||'custom',show_logo:!!$('vi4-show-logo')?.checked,show_photo:!!$('vi4-show-photo')?.checked,logo_size:$('vi4-logo-size')?.value||'medium',photo_size:$('vi4-photo-size')?.value||'medium',logo_shape:$('vi4-logo-shape')?.value||'none',photo_shape:$('vi4-photo-shape')?.value||'circle',logo_fit:$('vi4-logo-fit')?.value||'contain',photo_fit:$('vi4-photo-fit')?.value||'cover',logo_position:$('vi4-layout')?.value||'stacked',logo_asset:$('vi4-logo-asset')?.value||'main'}}
function setCfg(c){c=normalizeCfg(c);$('vi4-preset').value=c.preset||'custom';$('vi4-show-logo').checked=!!c.show_logo;$('vi4-show-photo').checked=!!c.show_photo;$('vi4-logo-size').value=c.logo_size;$('vi4-photo-size').value=c.photo_size;$('vi4-logo-shape').value=c.logo_shape;$('vi4-photo-shape').value=c.photo_shape;$('vi4-logo-fit').value=c.logo_fit;$('vi4-photo-fit').value=c.photo_fit;$('vi4-layout').value=c.logo_position;$('vi4-logo-asset').value=c.logo_asset||'main'}
function status(msg='',kind=''){const el=$('vi4-status');if(!el)return;el.textContent=msg;el.dataset.kind=kind}

async function imageInfoFromFile(file){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),img=new Image();img.onload=()=>{const w=img.naturalWidth,h=img.naturalHeight,scale=Math.min(1,220/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,c.width,c.height);let alpha=false;try{const d=x.getImageData(0,0,c.width,c.height).data;for(let i=3;i<d.length;i+=4){if(d[i]<250){alpha=true;break}}}catch{}URL.revokeObjectURL(u);resolve({w,h,alpha,type:file.type||''})};img.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('No se pudo leer la imagen.'))};img.src=u})}
async function validate(key,file){if(!file)return true;if(key!=='photo'){
  if(file.type!=='image/png'&&!file.name.toLowerCase().endsWith('.png')){status('El logo debe ser PNG con fondo transparente.','error');return false}
  const m=await imageInfoFromFile(file);if(!m.alpha){status('El PNG seleccionado no contiene transparencia. Retira el fondo antes de cargarlo.','error');return false}
  if(m.w<600||m.h<600)status(`Logo ${m.w}×${m.h}px · Resolución baja ⚠. Recomendamos 1000×1000 px o superior.`,'warning');else status(`Logo ${m.w}×${m.h}px · PNG · Transparente ✓`,'success');return true;
 }
 const m=await imageInfoFromFile(file);if(m.w<800||m.h<800)status(`Fotografía ${m.w}×${m.h}px · Resolución baja ⚠. Recomendamos 1200×1200 px o superior.`,'warning');else status(`Fotografía ${m.w}×${m.h}px · Calidad adecuada ✓`,'success');return true;
}
function loadMeta(src,el,key){if(!el)return;if(!src){el.textContent=key==='photo'?'Sin fotografía cargada':'Sin imagen cargada';return}const img=new Image();img.onload=()=>{const ext=(assetPath(key)?.split('.').pop()||'PNG').toUpperCase();el.textContent=`${img.naturalWidth} × ${img.naturalHeight} px · ${ext}${key!=='photo'?' · Transparencia requerida':''}`};img.onerror=()=>{el.textContent='Imagen cargada'};img.src=src}
function paint(imgId,emptyId,src){const img=$(imgId),empty=$(emptyId);if(!img||!empty)return;if(src){img.src=src;img.hidden=false;empty.hidden=true}else{img.removeAttribute('src');img.hidden=true;empty.hidden=false}}
function render(){
  if(!state.profile)return;const selected=$('vi4-logo-asset')?.value||'main',logoSrc=assetSource(selected),photoSrc=assetSource('photo'),mainSrc=assetSource('main'),darkSrc=assetSource('dark');
  paint('vi4-logo-img','vi4-logo-empty',logoSrc);paint('vi4-photo-img','vi4-photo-empty',photoSrc);paint('vi4-light-img','vi4-light-empty',mainSrc);paint('vi4-dark-img','vi4-dark-empty',darkSrc);
  loadMeta(logoSrc,$('vi4-logo-meta'),selected);loadMeta(photoSrc,$('vi4-photo-meta'),'photo');
  document.querySelector('[data-delete="selected-logo"]')?.toggleAttribute('disabled',!logoSrc);document.querySelector('[data-delete="photo"]')?.toggleAttribute('disabled',!photoSrc);
}
function markCustom(){if($('vi4-preset')&&$('vi4-preset').value!=='custom')$('vi4-preset').value='custom'}
function changeKey(key){if(key==='selected-logo')key=$('vi4-logo-asset').value==='icon'?'icon':'main';$(`vi4-${key}-file`)?.click()}
async function fileChanged(key,file){if(!file)return;if(!await validate(key,file)){const input=$(`vi4-${key}-file`);if(input)input.value='';return}setPending(key,file);render()}
async function deleteAsset(key){if(key==='selected-logo')key=$('vi4-logo-asset').value==='icon'?'icon':'main';const path=assetPath(key);if(!path&&!state.pending[key])return;if(!confirm(`¿Eliminar ${key==='photo'?'la fotografía':key==='icon'?'el isotipo':key==='dark'?'el logo para modo oscuro':'el logo principal'}?`))return;revoke(key);state.pending[key]=null;const col=key==='main'?'logo_path':key==='icon'?'logo_icon_path':key==='dark'?'logo_dark_path':'photo_path';const payload={[col]:null,updated_at:new Date().toISOString()};if(key==='main'&&state.kind!=='advisor')payload.logo_data_url=null;const{data,error}=await supabase.from(state.table).update(payload).eq('id',state.id).select('*').single();if(error){status(error.message||'No se pudo eliminar la imagen.','error');return}if(path)await supabase.storage.from(cfg.storageBucket).remove([path]).catch(()=>{});state.profile=data;status('Imagen eliminada.','success');render()}

function bind(){
  ['main','icon','dark','photo'].forEach(key=>$(`vi4-${key}-file`)?.addEventListener('change',e=>fileChanged(key,e.target.files?.[0])));
  document.querySelectorAll('[data-change]').forEach(b=>b.addEventListener('click',()=>changeKey(b.dataset.change)));
  document.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteAsset(b.dataset.delete)));
  $('vi4-logo-asset')?.addEventListener('change',()=>{markCustom();render()});
  ['vi4-show-logo','vi4-show-photo','vi4-logo-size','vi4-photo-size','vi4-logo-shape','vi4-photo-shape','vi4-logo-fit','vi4-photo-fit','vi4-layout'].forEach(id=>$(id)?.addEventListener('change',markCustom));
  $('vi4-preset')?.addEventListener('change',()=>{const k=$('vi4-preset').value;if(presets[k]){const cur=cfgNow(),n={...cur,...presets[k],preset:k};setCfg(n);render()}});
  state.form.addEventListener('submit',()=>setTimeout(saveAll,80));
}
async function upload(key,file){const ext=(file.name.split('.').pop()||'png').toLowerCase(),owner=state.profile?.user_id||'shared',path=`${owner}/${state.id}/vi4-${key}-${Date.now()}.${ext}`;const{error}=await supabase.storage.from(cfg.storageBucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(error)throw error;return path}
async function saveAll(){if(!state.profile||!state.id)return;try{
  const payload={visual_identity:cfgNow(),updated_at:new Date().toISOString()},old={};
  for(const key of ['main','icon','dark','photo']){const file=state.pending[key];if(!file)continue;if(!await validate(key,file))return;const col=key==='main'?'logo_path':key==='icon'?'logo_icon_path':key==='dark'?'logo_dark_path':'photo_path';old[key]=assetPath(key);payload[col]=await upload(key,file)}
  const{data,error}=await supabase.from(state.table).update(payload).eq('id',state.id).select('*').single();if(error)throw error;state.profile=data;
  for(const key of Object.keys(old)){if(old[key])await supabase.storage.from(cfg.storageBucket).remove([old[key]]).catch(()=>{});setPending(key,null);const input=$(`vi4-${key}-file`);if(input)input.value=''}
  status('Identidad visual guardada.','success');render();
 }catch(e){status(e.message||'No fue posible guardar la identidad visual.','error')}
}
async function loadProfile(){if(state.kind==='advisor'){const slug=$('slug')?.value.trim();if(!slug)return null;const{data}=await supabase.from(state.table).select('*').eq('slug',slug).maybeSingle();if(!data)return null;state.profile=data;state.id=data.id;state.lastSlug=slug}else{if(!state.id)return null;const{data}=await supabase.from(state.table).select('*').eq('id',state.id).maybeSingle();state.profile=data}if(state.profile){setCfg(normalizeCfg(state.profile.visual_identity||{}));render()}return state.profile}
function enforceAccordions(){document.querySelectorAll('details.editor-accordion').forEach(d=>{if(d.dataset.vi4Accordion)return;d.dataset.vi4Accordion='1';d.addEventListener('toggle',()=>{if(d.open){document.querySelectorAll('details.editor-accordion').forEach(o=>{if(o!==d)o.open=false});document.querySelectorAll('details.editor-accordion').forEach(o=>o.classList.toggle('is-active-section',o===d))}else d.classList.remove('is-active-section')})});const open=[...document.querySelectorAll('details.editor-accordion[open]')];open.slice(1).forEach(d=>d.open=false);document.querySelectorAll('details.editor-accordion').forEach(d=>d.classList.toggle('is-active-section',d.open))}
async function init(){if(!detect())return;inject();enforceAccordions();new MutationObserver(enforceAccordions).observe(state.form,{childList:true,subtree:true});if(state.kind!=='advisor')await loadProfile();else{for(let i=0;i<40&&!$('slug')?.value;i++)await new Promise(r=>setTimeout(r,150));await loadProfile();setInterval(async()=>{const s=$('slug')?.value.trim();if(s&&s!==state.lastSlug){Object.keys(state.pending).forEach(k=>{revoke(k);state.pending[k]=null});await loadProfile()}},500)} }
window.addEventListener('beforeunload',()=>state.urls.forEach(u=>URL.revokeObjectURL(u)));
init().catch(console.error);
