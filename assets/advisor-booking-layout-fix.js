const $=id=>document.getElementById(id);

function summaryMarkup(icon,title,subtitle){
  return `<span class="accordion-icon" aria-hidden="true">${icon}</span><span class="accordion-title-wrap"><span class="accordion-title">${title}</span><span class="accordion-subtitle">${subtitle}</span></span><span class="accordion-state"><span class="accordion-dirty" title="Cambios sin guardar"></span><span class="accordion-plan-tag is-hidden"></span></span><span class="accordion-chevron" aria-hidden="true">⌄</span>`;
}

function wrapFieldset(fieldset,{section,icon,title,subtitle}){
  if(!fieldset)return null;
  const existing=fieldset.closest(`.editor-accordion[data-section="${section}"]`);
  if(existing)return existing;
  const details=document.createElement('details');
  details.className='editor-accordion ttd-booking-accordion';
  details.dataset.section=section;
  const summary=document.createElement('summary');
  summary.innerHTML=summaryMarkup(icon,title,subtitle);
  const body=document.createElement('div');
  body.className='accordion-body';
  details.append(summary,body);
  body.appendChild(fieldset);
  return details;
}

function updateSubtitles(){
  const loc=$('ttd-locations-admin-fieldset')?.closest('.editor-accordion');
  const booking=$('ttd-booking-admin-fieldset')?.closest('.editor-accordion');
  if(loc){
    const count=document.querySelectorAll('#ttd-locations-admin .ttd-admin-card').length;
    const sub=loc.querySelector('.accordion-subtitle');
    if(sub)sub.textContent=count?`${count} punto${count===1?'':'s'} configurado${count===1?'':'s'}`:'Sin puntos configurados';
  }
  if(booking){
    const enabled=$('ttd-booking-enabled')?.checked;
    const sub=booking.querySelector('.accordion-subtitle');
    if(sub)sub.textContent=enabled?'Agenda pública activa':'Agenda pública desactivada';
  }
}

function placeSections(){
  const form=$('profile-form');
  const services=document.querySelector('.editor-accordion[data-section="services"]');
  const appearance=document.querySelector('.editor-accordion[data-section="appearance"]');
  const locFs=$('ttd-locations-admin-fieldset');
  const bookingFs=$('ttd-booking-admin-fieldset');
  if(!form||!services||!locFs||!bookingFs)return false;

  const locDetails=wrapFieldset(locFs,{section:'locations',icon:'◎',title:'Puntos de atención',subtitle:'Ubicaciones disponibles'});
  const bookingDetails=wrapFieldset(bookingFs,{section:'booking',icon:'▦',title:'Agenda TTD',subtitle:'Disponibilidad y solicitudes'});
  if(!locDetails||!bookingDetails)return false;

  if(appearance){
    form.insertBefore(locDetails,appearance);
    form.insertBefore(bookingDetails,appearance);
  }else{
    services.insertAdjacentElement('afterend',locDetails);
    locDetails.insertAdjacentElement('afterend',bookingDetails);
  }

  locDetails.open=false;
  bookingDetails.open=false;
  updateSubtitles();

  if(!locDetails.dataset.ttdBound){
    locDetails.dataset.ttdBound='1';
    bookingDetails.dataset.ttdBound='1';
    const refresh=()=>setTimeout(updateSubtitles,30);
    locDetails.addEventListener('toggle',refresh);
    bookingDetails.addEventListener('toggle',refresh);
    locDetails.addEventListener('input',refresh,true);
    locDetails.addEventListener('change',refresh,true);
    bookingDetails.addEventListener('input',refresh,true);
    bookingDetails.addEventListener('change',refresh,true);
    const locRoot=$('ttd-locations-admin');
    if(locRoot)new MutationObserver(refresh).observe(locRoot,{childList:true,subtree:true});
  }
  return true;
}

let attempts=0;
const timer=setInterval(()=>{
  attempts++;
  if(placeSections()||attempts>120)clearInterval(timer);
},100);

window.addEventListener('load',()=>setTimeout(placeSections,150));
const editor=$('editor-panel');
if(editor)new MutationObserver(()=>{if(!editor.classList.contains('is-hidden'))setTimeout(placeSections,120)}).observe(editor,{attributes:true,attributeFilter:['class']});
