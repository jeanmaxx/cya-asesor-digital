import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg=window.SUPABASE_CONFIG||{};
if(!cfg.url||!cfg.publishableKey) throw new Error('TTD agenda: Supabase no configurado.');
const supabase=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const qs=new URLSearchParams(location.search);
const slug=qs.get('asesor')||cfg.defaultSlug||'';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let ctx=null,profile=null,services=[],selectedMode='phone',selectedSlot=null;

function sectionAnchor(){return document.querySelector('.closing-card')||document.querySelector('footer')||document.body.lastElementChild}
function dateISO(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function mxDate(iso){const [y,m,d]=String(iso).split('-').map(Number);return new Intl.DateTimeFormat('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,d))}
function digits(v){return String(v||'').replace(/\D/g,'')}
function calendarUrl(start,end,title,details,where){const compact=x=>new Date(x).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${compact(start)}/${compact(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(where||'')}`}
function whatsappUrl(message){const n=digits(profile?.whatsapp||profile?.phone);if(!n)return'';const normalized=n.length===10?`52${n}`:n;return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`}

function renderLocations(){
  const locations=Array.isArray(ctx?.locations)?ctx.locations:[];
  if(!locations.length)return;
  const s=document.createElement('section');s.className='ttd-advisor-locations';
  s.innerHTML=`<div class="ttd-advisor-section-head"><div><p>Puntos de atención</p><h2>Elige dónde te conviene atenderte</h2></div><span>⌖</span></div><div class="ttd-location-grid"></div>`;
  const grid=s.querySelector('.ttd-location-grid');
  locations.forEach(l=>{const card=document.createElement('article');card.className='ttd-location-card';const place=[l.city,l.state].filter(Boolean).join(', ');card.innerHTML=`<strong>${esc(l.name)}</strong>${place?`<p>${esc(place)}</p>`:''}${l.address?`<small>${esc(l.address)}</small>`:''}${l.instructions?`<small>${esc(l.instructions)}</small>`:''}${l.maps_url?`<a href="${esc(l.maps_url)}" target="_blank" rel="noopener">Ver ubicación ↗</a>`:''}`;grid.appendChild(card)});
  sectionAnchor()?.before(s);
}

function availableModes(){const s=ctx?.settings||{},m=[];if(s.allow_in_person&&(ctx.locations||[]).some(l=>l.appointment_enabled))m.push(['in_person','Presencial']);if(s.allow_phone)m.push(['phone','Telefónica']);if(s.allow_video)m.push(['video','Videollamada']);return m}

function renderBooking(){
  if(!ctx?.booking_enabled)return;
  const modes=availableModes();if(!modes.length)return;
  selectedMode=modes[0][0];
  const today=new Date(),max=addDays(today,Number(ctx.settings?.max_days_ahead)||60);
  const s=document.createElement('section');s.className='ttd-advisor-booking';s.id='agenda';
  s.innerHTML=`<div class="ttd-advisor-section-head"><div><p>Agenda TTD</p><h2>Agenda una asesoría</h2></div><span>◫</span></div><p class="ttd-booking-intro">Elige modalidad, fecha y hora. La solicitud se registra en TTD y queda pendiente de confirmación.</p><form id="ttd-booking-form" class="ttd-booking-grid"><label class="ttd-span-2">¿Sobre qué tema necesitas orientación?<select id="ttd-booking-service"><option value="">Asesoría general</option></select></label><div class="ttd-span-2"><label>Modalidad</label><div id="ttd-mode-row" class="ttd-mode-row"></div></div><label id="ttd-location-label" class="ttd-hidden">Punto de atención<select id="ttd-booking-location"></select></label><label>Fecha<input id="ttd-booking-date" type="date" min="${dateISO(today)}" max="${dateISO(max)}" required></label><div class="ttd-span-2"><label>Horario disponible</label><div id="ttd-slots" class="ttd-slot-wrap"><span class="ttd-slot-empty">Selecciona una fecha.</span></div></div><label>Nombre<input id="ttd-customer-name" type="text" maxlength="120" autocomplete="name" required></label><label>Teléfono / WhatsApp<input id="ttd-customer-phone" type="tel" maxlength="40" autocomplete="tel" required></label><label>Correo electrónico <span style="font-weight:500;opacity:.6">(opcional)</span><input id="ttd-customer-email" type="email" maxlength="160" autocomplete="email"></label><label>Nota <span style="font-weight:500;opacity:.6">(opcional)</span><input id="ttd-customer-notes" type="text" maxlength="300" placeholder="Ej. prefiero videollamada"></label><div class="ttd-span-2"><button id="ttd-booking-submit" class="ttd-booking-submit" type="submit">Solicitar asesoría</button><p id="ttd-booking-msg" class="ttd-booking-msg" aria-live="polite"></p><div id="ttd-booking-success" class="ttd-booking-success ttd-hidden"></div></div></form>`;
  sectionAnchor()?.before(s);
  const serviceSel=s.querySelector('#ttd-booking-service');services.filter(x=>x.is_visible!==false).forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=x.title;serviceSel.appendChild(o)});
  const modeRow=s.querySelector('#ttd-mode-row');modes.forEach(([key,label])=>{const b=document.createElement('button');b.type='button';b.className='ttd-mode-btn'+(key===selectedMode?' is-active':'');b.dataset.mode=key;b.textContent=label;b.onclick=()=>{selectedMode=key;selectedSlot=null;modeRow.querySelectorAll('.ttd-mode-btn').forEach(x=>x.classList.toggle('is-active',x===b));updateLocationVisibility(s);clearSlots(s,'Vuelve a elegir fecha para actualizar horarios.');};modeRow.appendChild(b)});
  const loc=s.querySelector('#ttd-booking-location');(ctx.locations||[]).filter(l=>l.appointment_enabled).forEach(l=>{const o=document.createElement('option');o.value=l.id;o.textContent=[l.name,l.city,l.state].filter(Boolean).join(' · ');loc.appendChild(o)});updateLocationVisibility(s);
  s.querySelector('#ttd-booking-date').addEventListener('change',e=>loadSlots(s,e.target.value));
  s.querySelector('#ttd-booking-form').addEventListener('submit',e=>submitBooking(e,s));
}

function updateLocationVisibility(root){root.querySelector('#ttd-location-label')?.classList.toggle('ttd-hidden',selectedMode!=='in_person')}
function clearSlots(root,text='Selecciona una fecha.'){selectedSlot=null;const wrap=root.querySelector('#ttd-slots');wrap.innerHTML=`<span class="ttd-slot-empty">${esc(text)}</span>`}
async function loadSlots(root,date){
  clearSlots(root,'Cargando horarios…');if(!date)return;
  const{data,error}=await supabase.rpc('get_advisor_booking_slots',{p_slug:slug,p_date:date});const wrap=root.querySelector('#ttd-slots');wrap.replaceChildren();
  if(error){wrap.innerHTML='<span class="ttd-slot-empty">No fue posible consultar horarios.</span>';return}
  const slots=Array.isArray(data)?data:[];if(!slots.length){wrap.innerHTML='<span class="ttd-slot-empty">No hay horarios disponibles para esta fecha.</span>';return}
  slots.forEach(slot=>{const b=document.createElement('button');b.type='button';b.className='ttd-slot';b.textContent=`${slot.start} – ${slot.end}`;b.onclick=()=>{selectedSlot=slot;wrap.querySelectorAll('.ttd-slot').forEach(x=>x.classList.toggle('is-active',x===b))};wrap.appendChild(b)});
}

async function submitBooking(e,root){
  e.preventDefault();const msg=root.querySelector('#ttd-booking-msg'),btn=root.querySelector('#ttd-booking-submit');msg.className='ttd-booking-msg';msg.textContent='';if(!selectedSlot){msg.classList.add('is-error');msg.textContent='Selecciona un horario disponible.';return}
  const date=root.querySelector('#ttd-booking-date').value,locationId=selectedMode==='in_person'?(root.querySelector('#ttd-booking-location').value||null):null;
  btn.disabled=true;btn.textContent='Registrando…';
  const payload={p_slug:slug,p_service_id:root.querySelector('#ttd-booking-service').value||null,p_location_id:locationId,p_mode:selectedMode,p_date:date,p_start_time:selectedSlot.start,p_customer_name:root.querySelector('#ttd-customer-name').value.trim(),p_customer_phone:root.querySelector('#ttd-customer-phone').value.trim(),p_customer_email:root.querySelector('#ttd-customer-email').value.trim()||null,p_customer_notes:root.querySelector('#ttd-customer-notes').value.trim()||null};
  const{data,error}=await supabase.rpc('request_advisor_appointment',payload);btn.disabled=false;btn.textContent='Solicitar asesoría';
  if(error){msg.classList.add('is-error');msg.textContent=error.message||'No fue posible registrar la solicitud.';await loadSlots(root,date);return}
  const service=services.find(x=>x.id===payload.p_service_id)?.title||'Asesoría general';const location=(ctx.locations||[]).find(x=>x.id===locationId);const modeLabel={in_person:'Presencial',phone:'Telefónica',video:'Videollamada'}[selectedMode];const when=`${mxDate(date)} · ${selectedSlot.start}`;const status=data?.status==='confirmed'?'Confirmada':'Pendiente de confirmación';const waText=`Hola, acabo de solicitar una asesoría desde tu tarjeta TTD.\n\n📌 ${service}\n📅 ${when}\n💬 Modalidad: ${modeLabel}${location?`\n📍 ${location.name}`:''}\n\nEstado: ${status}.`;
  const cal=calendarUrl(data.starts_at,data.ends_at,`Asesoría — ${profile?.first_names||'Asesor'} · ${service}`,`Solicitud registrada en TTD. Estado: ${status}.`,location?.address||location?.name||modeLabel);
  const success=root.querySelector('#ttd-booking-success');success.classList.remove('ttd-hidden');success.innerHTML=`<h3>Solicitud registrada ✓</h3><p><strong>${esc(status)}</strong><br>${esc(service)} · ${esc(when)} · ${esc(modeLabel)}${location?` · ${esc(location.name)}`:''}</p><div class="ttd-booking-actions">${whatsappUrl(waText)?`<a href="${esc(whatsappUrl(waText))}" target="_blank" rel="noopener">Enviar por WhatsApp</a>`:''}<a class="is-secondary" href="${esc(cal)}" target="_blank" rel="noopener">Agregar como pendiente a Calendar</a></div>`;success.scrollIntoView({behavior:'smooth',block:'nearest'});msg.textContent='';await loadSlots(root,date);
}

async function init(){
  if(!slug||location.pathname.toLowerCase().includes('/admin/'))return;
  const [{data:context,error:ctxError},{data:p},{data:s}]=await Promise.all([
    supabase.rpc('get_public_advisor_booking_context',{p_slug:slug}),
    supabase.from('advisor_profiles').select('first_names,last_names,phone,whatsapp').eq('slug',slug).eq('is_published',true).maybeSingle(),
    supabase.from('advisor_services').select('id,title,is_visible,sort_order').eq('advisor_id',(await supabase.from('advisor_profiles').select('id').eq('slug',slug).eq('is_published',true).maybeSingle()).data?.id||'00000000-0000-0000-0000-000000000000').eq('is_visible',true).order('sort_order')
  ]);
  if(ctxError||!context)return;ctx=context;profile=p||{};services=s||[];renderLocations();renderBooking();
}

init().catch(err=>console.warn('TTD agenda:',err));
