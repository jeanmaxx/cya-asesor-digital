const $=id=>document.getElementById(id);
function detect(){
  if($('profile-form'))return{form:$('profile-form'),panel:$('editor-panel'),save:$('save-profile'),preview:$('profile-preview-link'),back:$('back-to-accounts')||$('cancel-edit')};
  if($('business-form'))return{form:$('business-form'),panel:$('business-editor'),save:$('save-business'),preview:$('business-preview'),back:document.querySelector('a[href="esteticas.html"]')};
  if($('other-form'))return{form:$('other-form'),panel:$('other-editor'),save:$('save-other'),preview:$('other-preview'),back:document.querySelector('a[href="otros.html"]')};
  return null;
}
function init(){
  const ctx=detect();if(!ctx||document.querySelector('.editor-action-rail'))return;
  const rail=document.createElement('aside');rail.className='editor-action-rail';rail.innerHTML=`<button type="button" class="rail-save">Guardar cambios</button><a class="rail-open" href="#" target="_blank" rel="noopener">Abrir tarjeta ↗</a><button type="button" class="rail-back">Regresar al panel</button><small>Acciones del editor</small>`;
  document.body.appendChild(rail);
  const save=rail.querySelector('.rail-save'),open=rail.querySelector('.rail-open'),back=rail.querySelector('.rail-back');
  save.addEventListener('click',()=>ctx.form.requestSubmit());
  open.addEventListener('click',e=>{if(open.getAttribute('aria-disabled')==='true'){e.preventDefault();return}});
  back.addEventListener('click',()=>{if(ctx.back?.tagName==='A'&&ctx.back.href){location.href=ctx.back.href;return}ctx.back?.click()});
  const sync=()=>{
    const visible=!ctx.panel||!ctx.panel.classList.contains('is-hidden');rail.classList.toggle('is-hidden',!visible);
    const href=ctx.preview?.href||ctx.preview?.getAttribute?.('href')||'';const usable=!!href&&href!=='#'&&!href.endsWith('#');open.href=usable?href:'#';open.setAttribute('aria-disabled',usable?'false':'true');
    save.disabled=!!ctx.save?.disabled;
  };
  sync();
  if(ctx.panel)new MutationObserver(sync).observe(ctx.panel,{attributes:true,attributeFilter:['class']});
  if(ctx.preview)new MutationObserver(sync).observe(ctx.preview,{attributes:true,attributeFilter:['href']});
  if(ctx.save)new MutationObserver(sync).observe(ctx.save,{attributes:true,attributeFilter:['disabled']});
  setInterval(sync,800);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
