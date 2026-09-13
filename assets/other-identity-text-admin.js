import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.SUPABASE_CONFIG||{};
const supabase=createClient(cfg.url,cfg.publishableKey);
const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get('id')||'';
let pendingSave=false,visualDone=false,mainDone=false,savingPatch=false,profile=null,injecting=false,bound=false;
const size=v=>['small','medium','large'].includes(v)?v:'small';

function syncMirrorToBase(){
  const name=$('vi-text-name'),tag=$('vi-text-tagline'),baseName=$('o-name'),baseTag=$('o-tagline');
  if(name&&baseName)baseName.value=name.value;
  if(tag&&baseTag)baseTag.value=tag.value;
}
function syncBaseToMirror(){
  const name=$('vi-text-name'),tag=$('vi-text-tagline'),baseName=$('o-name'),baseTag=$('o-tagline');
  if(name&&baseName&&document.activeElement!==name)name.value=baseName.value;
  if(tag&&baseTag&&document.activeElement!==tag)tag.value=baseTag.value;
}
function markCustom(){const p=$('vi4-preset');if(p&&p.value!=='custom')p.value='custom'}
function dedupe(){
  const sections=[...document.querySelectorAll('.vi-text-config')];
  sections.slice(1).forEach(node=>node.remove());
  return sections[0]||null;
}

async function saveTextIdentity(){
  if(savingPatch||!id)return;
  savingPatch=true;
  try{
    const {data,error}=await supabase.from('business_profiles').select('visual_identity').eq('id',id).single();
    if(error)throw error;
    const visual={...(data?.visual_identity||{}),tagline_size:size($('vi-text-tagline-size')?.value),name_size:size($('vi-text-name-size')?.value)};
    const payload={visual_identity:visual,business_name:($('vi-text-name')?.value||$('o-name')?.value||'').trim(),tagline:(($('vi-text-tagline')?.value||$('o-tagline')?.value||'').trim()||null),updated_at:new Date().toISOString()};
    const {error:updateError}=await supabase.from('business_profiles').update(payload).eq('id',id);
    if(updateError)throw updateError;
    const status=$('vi4-status');if(status){status.textContent='Identidad visual y texto guardados.';status.dataset.kind='success'}
    window.dispatchEvent(new CustomEvent('identity-text:saved',{detail:{id}}));
  }catch(e){
    const status=$('vi4-status');if(status){status.textContent=e?.message||'No fue posible guardar el texto del encabezado.';status.dataset.kind='error'}
  }finally{savingPatch=false;pendingSave=false;visualDone=false;mainDone=false}
}
function maybeSave(){if(!pendingSave||savingPatch)return;if(mainDone&&visualDone)saveTextIdentity()}

function bindOnce(){
  if(bound)return;bound=true;
  $('vi-text-name')?.addEventListener('input',syncMirrorToBase);
  $('vi-text-tagline')?.addEventListener('input',syncMirrorToBase);
  $('vi-text-name-size')?.addEventListener('change',markCustom);
  $('vi-text-tagline-size')?.addEventListener('change',markCustom);
  $('o-name')?.addEventListener('input',syncBaseToMirror);
  $('o-tagline')?.addEventListener('input',syncBaseToMirror);
  const form=$('other-form');
  form?.addEventListener('submit',()=>{
    syncMirrorToBase();pendingSave=true;visualDone=false;mainDone=false;
    setTimeout(()=>{if(pendingSave&&!visualDone){visualDone=true;maybeSave()}},2200);
  },true);
  window.addEventListener('visual-identity:saved',()=>{if(pendingSave){visualDone=true;maybeSave()}});
  window.addEventListener('visual-identity:error',()=>{pendingSave=false});
  const message=$('other-save-message');
  if(message)new MutationObserver(()=>{
    if(!pendingSave)return;
    if(message.classList.contains('is-error')){pendingSave=false;return}
    if(message.classList.contains('is-success')&&/guardad/i.test(message.textContent||'')){mainDone=true;maybeSave()}
  }).observe(message,{childList:true,subtree:true,attributes:true});
}

async function inject(){
  if(!id||!$('other-form'))return false;
  const config=document.querySelector('.vi-v4-config');
  if(!config)return false;
  const existing=dedupe();
  if(existing){bindOnce();return true}
  if(injecting)return false;
  injecting=true;
  try{
    const {data}=await supabase.from('business_profiles').select('business_name,tagline,category,visual_identity').eq('id',id).maybeSingle();
    profile=data||{};
    const already=dedupe();
    if(already){bindOnce();return true}
    const visual=profile.visual_identity||{};
    const section=document.createElement('section');section.className='vi-v4-config vi-text-config';
    section.innerHTML=`<div><strong>Texto del encabezado</strong><p class="hint">Estos campos son los mismos de Identidad y se sincronizan automáticamente. El tamaño actual equivale a Chico.</p></div><div class="vi-v4-grid vi-v4-grid--2"><label>Texto superior<input id="vi-text-tagline" maxlength="100"></label><label>Tamaño del texto superior<select id="vi-text-tagline-size"><option value="small">Chico</option><option value="medium">Mediano</option><option value="large">Grande</option></select></label><label>Nombre del negocio<input id="vi-text-name" maxlength="120"></label><label>Tamaño del nombre<select id="vi-text-name-size"><option value="small">Chico</option><option value="medium">Mediano</option><option value="large">Grande</option></select></label></div>`;
    config.insertAdjacentElement('afterend',section);
    $('vi-text-name').value=$('o-name')?.value||profile.business_name||'';
    $('vi-text-tagline').value=$('o-tagline')?.value||profile.tagline||profile.category||'';
    $('vi-text-tagline-size').value=size(visual.tagline_size);
    $('vi-text-name-size').value=size(visual.name_size);
    bindOnce();
    return true;
  }finally{injecting=false}
}

let attempts=0;const timer=setInterval(async()=>{attempts++;if(await inject()||attempts>80)clearInterval(timer)},150);
