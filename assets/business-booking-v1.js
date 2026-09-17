import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SUPABASE_CONFIG || {};
const supabase = createClient(cfg.url, cfg.publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
const qs = new URLSearchParams(location.search);
const slug = qs.get('negocio') || 'studio-cavalier';
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const digits = v => String(v || '').replace(/\D/g, '');

let profile = null;
let services = [];
let selectedService = null;
let selectedDate = null;
let selectedSlot = null;
let monthCursor = new Date();
monthCursor.setDate(1);

function bookingCfg() {
  return profile?.booking_config || {
    closed_weekdays: [0], start: '10:00', end: '18:00',
    break_start: '12:00', break_end: '14:00', slot_minutes: 30,
    duration_minutes: 45, max_days_ahead: 90, timezone: 'America/Mexico_City'
  };
}

function humanDate(d) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(d);
}

function compactDate(iso) {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function googleCalendarUrl(start, end, title, details, where) {
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${compactDate(start)}/${compactDate(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(where || '')}`;
}

function whatsappUrl(message) {
  const n = digits(profile?.whatsapp);
  if (!n) return '';
  const number = n.length === 10 ? `52${n}` : n;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function sameDate(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildUI() {
  const section = $('booking-section');
  if (!section || !profile?.booking_enabled) return;
  section.innerHTML = `
    <div class="section-head">
      <p>Agenda</p><h2>Solicita tu cita</h2>
      <span id="booking-hours-copy"></span>
    </div>
    <div class="ttd-business-service-choice">
      <label for="ttd-business-service">Servicio</label>
      <select id="ttd-business-service">
        <option value="">Selecciona un servicio</option>
      </select>
    </div>
    <div class="ttd-business-booking-layout">
      <div class="calendar-card">
        <div class="calendar-head">
          <button id="prev-month" type="button" aria-label="Mes anterior">‹</button>
          <strong id="month-label"></strong>
          <button id="next-month" type="button" aria-label="Mes siguiente">›</button>
        </div>
        <div class="weekdays"><span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span></div>
        <div id="calendar-grid" class="calendar-grid"></div>
      </div>
      <div class="ttd-business-times-panel">
        <h3>Horarios disponibles</h3>
        <div id="times-grid" class="times-grid"><p class="ttd-booking-empty">Elige servicio y fecha.</p></div>
      </div>
    </div>
    <form id="ttd-business-booking-form" class="ttd-business-customer-form is-hidden">
      <div class="ttd-selected-slot" id="ttd-selected-slot"></div>
      <div class="ttd-customer-grid">
        <label>Nombre<input id="ttd-business-name" type="text" maxlength="120" autocomplete="name" required></label>
        <label>Teléfono / WhatsApp<input id="ttd-business-phone" type="tel" maxlength="40" autocomplete="tel" required></label>
        <label>Correo electrónico <span>(opcional)</span><input id="ttd-business-email" type="email" maxlength="160" autocomplete="email"></label>
        <label>Nota <span>(opcional)</span><input id="ttd-business-notes" type="text" maxlength="300"></label>
      </div>
      <button id="ttd-business-submit" class="btn btn--primary" type="submit">Solicitar cita</button>
      <p id="ttd-business-message" class="ttd-business-message" aria-live="polite"></p>
      <div id="ttd-business-success" class="ttd-business-success is-hidden"></div>
    </form>`;

  const c = bookingCfg();
  $('booking-hours-copy').textContent = `Horario ${c.start || '10:00'}–${c.end || '18:00'}`;

  services.filter(s => s.is_visible !== false).forEach(s => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = `${s.name}${s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}`;
    $('ttd-business-service').appendChild(o);
  });

  $('ttd-business-service').addEventListener('change', async e => {
    selectedService = services.find(s => s.id === e.target.value) || null;
    selectedSlot = null;
    hideCustomerForm();
    if (selectedDate) await loadSlots();
  });
  $('prev-month').addEventListener('click', () => { monthCursor.setMonth(monthCursor.getMonth() - 1); renderCalendar(); });
  $('next-month').addEventListener('click', () => { monthCursor.setMonth(monthCursor.getMonth() + 1); renderCalendar(); });
  $('ttd-business-booking-form').addEventListener('submit', submitBooking);

  bindServiceCards();
  renderCalendar();
}

function bindServiceCards() {
  const root = $('services-container');
  if (!root) return;
  root.addEventListener('click', async e => {
    const btn = e.target.closest('.service-book');
    if (!btn) return;
    const buttons = [...root.querySelectorAll('.service-book')];
    const visible = services.filter(s => s.is_visible !== false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
    const svc = visible[buttons.indexOf(btn)];
    if (svc) {
      selectedService = svc;
      $('ttd-business-service').value = svc.id;
      selectedSlot = null;
      hideCustomerForm();
      if (selectedDate) await loadSlots();
    }
    $('booking-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function renderCalendar() {
  const root = $('calendar-grid');
  if (!root) return;
  const cfgBooking = bookingCfg();
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  $('month-label').textContent = `${monthNames[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`;
  root.replaceChildren();

  const first = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) {
    const spacer = document.createElement('div');
    spacer.className = 'day is-empty';
    root.appendChild(spacer);
  }

  const today = new Date(); today.setHours(0,0,0,0);
  const max = new Date(today); max.setDate(max.getDate() + Number(cfgBooking.max_days_ahead || 90));
  const days = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const closed = new Set((cfgBooking.closed_weekdays || []).map(Number));

  for (let d = 1; d <= days; d++) {
    const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), d);
    date.setHours(0,0,0,0);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'day';
    cell.textContent = d;
    const disabled = date < today || date > max || closed.has(date.getDay());
    if (date < today || date > max) cell.classList.add('is-disabled');
    else if (closed.has(date.getDay())) cell.classList.add('is-closed');
    if (!disabled) cell.addEventListener('click', async () => {
      selectedDate = new Date(date);
      selectedSlot = null;
      hideCustomerForm();
      renderCalendar();
      await loadSlots();
    });
    if (sameDate(date, today)) cell.classList.add('is-today');
    if (sameDate(date, selectedDate)) cell.classList.add('is-selected');
    root.appendChild(cell);
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const cursorValue = monthCursor.getFullYear() * 12 + monthCursor.getMonth();
  const minValue = monthStart.getFullYear() * 12 + monthStart.getMonth();
  const maxValue = max.getFullYear() * 12 + max.getMonth();
  $('prev-month').disabled = cursorValue <= minValue;
  $('next-month').disabled = cursorValue >= maxValue;
}

async function loadSlots() {
  const root = $('times-grid');
  if (!root) return;
  root.innerHTML = '<p class="ttd-booking-empty">Cargando horarios…</p>';
  selectedSlot = null;
  hideCustomerForm();

  if (!selectedService) {
    root.innerHTML = '<p class="ttd-booking-empty">Selecciona primero un servicio.</p>';
    return;
  }
  if (!selectedDate) {
    root.innerHTML = '<p class="ttd-booking-empty">Selecciona una fecha.</p>';
    return;
  }

  const { data, error } = await supabase.rpc('get_business_booking_slots', {
    p_slug: slug,
    p_date: dateISO(selectedDate),
    p_service_id: selectedService.id
  });
  root.replaceChildren();
  if (error) {
    root.innerHTML = '<p class="ttd-booking-empty">No fue posible consultar horarios.</p>';
    return;
  }
  const slots = Array.isArray(data) ? data : [];
  if (!slots.length) {
    root.innerHTML = '<p class="ttd-booking-empty">No hay horarios disponibles para este día.</p>';
    return;
  }
  slots.forEach(slot => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'time-btn';
    b.textContent = `${slot.start} – ${slot.end}`;
    b.addEventListener('click', () => {
      selectedSlot = slot;
      root.querySelectorAll('.time-btn').forEach(x => x.classList.toggle('is-selected', x === b));
      showCustomerForm();
    });
    root.appendChild(b);
  });
}

function hideCustomerForm() {
  $('ttd-business-booking-form')?.classList.add('is-hidden');
}

function showCustomerForm() {
  if (!selectedService || !selectedDate || !selectedSlot) return;
  const form = $('ttd-business-booking-form');
  form.classList.remove('is-hidden');
  $('ttd-selected-slot').innerHTML = `<strong>${esc(selectedService.name)}</strong><span>${esc(humanDate(selectedDate))} · ${esc(selectedSlot.start)} – ${esc(selectedSlot.end)}</span>`;
  form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function submitBooking(e) {
  e.preventDefault();
  const msg = $('ttd-business-message');
  const button = $('ttd-business-submit');
  msg.textContent = '';
  msg.className = 'ttd-business-message';
  if (!selectedService || !selectedDate || !selectedSlot) {
    msg.textContent = 'Selecciona servicio, fecha y horario.';
    msg.classList.add('is-error');
    return;
  }

  const customerName = $('ttd-business-name').value.trim();
  const customerPhone = $('ttd-business-phone').value.trim();
  let popup = null;
  if (digits(profile?.whatsapp)) {
    try { popup = window.open('about:blank', '_blank'); if (popup) popup.opener = null; } catch { popup = null; }
  }

  button.disabled = true;
  button.textContent = 'Registrando…';
  const { data, error } = await supabase.rpc('request_business_appointment', {
    p_slug: slug,
    p_service_id: selectedService.id,
    p_date: dateISO(selectedDate),
    p_start_time: selectedSlot.start,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_customer_email: $('ttd-business-email').value.trim() || null,
    p_customer_notes: $('ttd-business-notes').value.trim() || null
  });
  button.disabled = false;
  button.textContent = 'Solicitar cita';

  if (error) {
    try { popup?.close(); } catch {}
    msg.textContent = error.message || 'No fue posible registrar la cita.';
    msg.classList.add('is-error');
    await loadSlots();
    return;
  }

  const status = data?.status === 'confirmed' ? 'Confirmada' : 'Pendiente de confirmación';
  const where = profile.location_mode === 'remote' ? 'Atención remota' : (profile.address || profile.location_short || '');
  const manageLink = `${location.origin}/confirmar/?token=${encodeURIComponent(data.manage_token)}`;
  const text = `Hola, mi nombre es: ${customerName}.\n\nAcabo de solicitar una cita desde TTD para: ${selectedService.name}.\n\n📅 ${humanDate(selectedDate)} · ${selectedSlot.start} – ${selectedSlot.end}\n📍 ${where || profile.business_name}\n\nEstado: ${status}.\n\nConfirma aquí:\n${manageLink}`;
  const wa = whatsappUrl(text);
  if (wa) {
    if (popup && !popup.closed) {
      try { popup.location.replace(wa); } catch { popup.location.href = wa; }
    } else window.open(wa, '_blank', 'noopener');
  } else {
    try { popup?.close(); } catch {}
  }

  const cal = googleCalendarUrl(
    data.starts_at, data.ends_at,
    `CITA — ${profile.business_name} · ${selectedService.name}`,
    `Cita solicitada desde TTD. Estado: ${status}.`,
    where
  );
  const success = $('ttd-business-success');
  success.classList.remove('is-hidden');
  success.innerHTML = `
    <h3>Solicitud registrada ✓</h3>
    <p><strong>${esc(status)}</strong><br>${esc(selectedService.name)} · ${esc(humanDate(selectedDate))} · ${esc(selectedSlot.start)}–${esc(selectedSlot.end)}</p>
    <p>No olvides el día y hora de tu cita. Guárdala en el calendario de tu teléfono.</p>
    <a class="btn btn--outline" href="${esc(cal)}" target="_blank" rel="noopener">Guardar en mi calendario</a>`;
  success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  await loadSlots();
}

async function boot() {
  if (!location.pathname.includes('/esteticas/')) return;
  const [{ data: p, error }, { data: s }] = await Promise.all([
    supabase.from('business_profiles').select('*').eq('slug', slug).eq('is_published', true).maybeSingle(),
    supabase.from('business_services').select('*').eq('is_visible', true).order('sort_order')
  ]);
  if (error || !p || !p.booking_enabled) return;
  profile = p;
  services = (s || []).filter(x => x.business_id === p.id);
  buildUI();
}

if (document.readyState === 'complete') setTimeout(() => boot().catch(console.warn), 0);
else window.addEventListener('load', () => boot().catch(err => console.warn('TTD business booking:', err)), { once: true });
