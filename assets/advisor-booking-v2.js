import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SUPABASE_CONFIG || {};
const supabase = createClient(cfg.url, cfg.publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
const qs = new URLSearchParams(location.search);
const slug = qs.get('asesor') || cfg.defaultSlug || '';
const esc = v => String(v ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const modeLabels = {
  in_person: 'Presencial',
  phone: 'Llamada',
  video: 'Videollamada',
  whatsapp: 'WhatsApp'
};
const CONFIRM_BASE_URL = 'https://ttd-alvasd.pages.dev/confirmar/';

let ctx = null;
let profile = null;
let services = [];
let selectedLocation = null;
let selectedMode = '';
let selectedSlot = null;
let coverageSection = null;
let bookingSection = null;

function ensureBookingThemeFix() {
  if (document.getElementById('ttd-booking-theme-fix')) return;
  const style = document.createElement('style');
  style.id = 'ttd-booking-theme-fix';
  style.textContent = `
    html[data-theme="dark"] #ttd-booking-service {
      color-scheme: dark;
      background-color: #17222f;
      color: #f7f8fa;
    }
    html[data-theme="dark"] #ttd-booking-service option {
      background-color: #17222f;
      color: #f7f8fa;
    }
    html[data-theme="light"] #ttd-booking-service {
      color-scheme: light;
    }
    html[data-theme="light"] #ttd-booking-service option {
      background-color: #ffffff;
      color: #111827;
    }
  `;
  document.head.appendChild(style);
}

function sectionAnchor() {
  return document.querySelector('.closing-card') || document.querySelector('footer') || document.body.lastElementChild;
}
function dateISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function mxDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date(y, m - 1, d));
}
function digits(v) {
  return String(v || '').replace(/\D/g, '');
}
function calendarUrl(start, end, title, details, where) {
  const compact = x => new Date(x).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${compact(start)}/${compact(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(where || '')}`;
}
function whatsappUrl(message) {
  const n = digits(profile?.whatsapp || profile?.phone);
  if (!n) return '';
  return `https://wa.me/${n.length === 10 ? '52' + n : n}?text=${encodeURIComponent(message)}`;
}
function bookingServiceLabel(title) {
  const t = String(title || '').toLocaleLowerCase('es-MX');
  if (t.includes('retiro') && t.includes('desempleo')) return 'Retiro por desempleo';
  if (t.includes('pensión') || t.includes('pension')) return 'Trámite de Pensión';
  if (t.includes('inconsist') || t.includes('corrección') || t.includes('correccion')) return 'Corrección de Datos ante IMSS';
  if (t.includes('plan personal') || t.includes('ppr')) return 'Planes Personales de Retiro';
  return title || 'Asesoría general';
}
function serviceRank(title) {
  return {
    'Retiro por desempleo': 10,
    'Trámite de Pensión': 20,
    'Corrección de Datos ante IMSS': 30,
    'Planes Personales de Retiro': 40
  }[bookingServiceLabel(title)] || 90;
}
function globalModeAllowed(mode) {
  const s = ctx?.settings || {};
  return mode === 'in_person' ? s.allow_in_person !== false
    : mode === 'phone' ? s.allow_phone !== false
    : mode === 'video' ? s.allow_video !== false
    : s.allow_whatsapp !== false;
}
function locationModes(loc) {
  const modes = Array.isArray(loc?.allowed_modes) && loc.allowed_modes.length
    ? loc.allowed_modes
    : ['in_person', 'phone', 'video', 'whatsapp'];
  return modes.filter(globalModeAllowed);
}
function groupByState(locations) {
  const m = new Map();
  locations.forEach(l => {
    const state = l.state || 'Otros';
    if (!m.has(state)) m.set(state, []);
    m.get(state).push(l);
  });
  return m;
}

function renderCoverage() {
  const locations = Array.isArray(ctx?.locations) ? ctx.locations : [];
  if (!locations.length) return;

  coverageSection = document.createElement('section');
  coverageSection.className = 'ttd-advisor-coverage';
  coverageSection.innerHTML = `
    <div class="ttd-advisor-section-head">
      <div><p>Cobertura</p><h2>Atención en diferentes ciudades</h2></div><span>⌖</span>
    </div>
    <p class="ttd-coverage-intro">Podemos orientarte presencialmente o a distancia según tu ubicación.</p>
    <div id="ttd-state-tabs" class="ttd-state-tabs"></div>
    <div id="ttd-city-chips" class="ttd-city-chips"></div>
    <div id="ttd-city-result" class="ttd-city-result ttd-hidden"></div>`;
  sectionAnchor()?.before(coverageSection);

  const grouped = groupByState(locations);
  const states = [...grouped.keys()];
  const tabs = coverageSection.querySelector('#ttd-state-tabs');
  const chips = coverageSection.querySelector('#ttd-city-chips');

  function activateState(state) {
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b.dataset.state === state));
    chips.replaceChildren();
    (grouped.get(state) || [])
      .sort((a, b) => (a.city || a.name).localeCompare(b.city || b.name, 'es'))
      .forEach(loc => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ttd-city-chip';
        b.textContent = loc.city || loc.name;
        b.onclick = () => selectLocation(loc, b);
        chips.appendChild(b);
      });
  }

  states.forEach(state => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ttd-state-tab';
    b.dataset.state = state;
    b.innerHTML = `<span>${esc(state)}</span><span class="ttd-state-chevron">⌄</span>`;
    b.onclick = () => activateState(state);
    tabs.appendChild(b);
  });
  activateState(states.includes('Querétaro') ? 'Querétaro' : states[0]);
}

function selectLocation(loc, button) {
  selectedLocation = loc;
  selectedSlot = null;
  coverageSection.querySelectorAll('.ttd-city-chip').forEach(x => x.classList.toggle('is-active', x === button));
  const modes = locationModes(loc);
  const result = coverageSection.querySelector('#ttd-city-result');
  const office = !!loc.has_physical_office;
  result.classList.remove('ttd-hidden');
  result.innerHTML = `
    <div>
      <p class="ttd-result-kicker">Atención disponible en</p>
      <h3>${esc(loc.city || loc.name)}, ${esc(loc.state || '')}</h3>
      <div class="ttd-result-modes">${modes.map(m => `<span>${esc(modeLabels[m] || m)}</span>`).join('')}</div>
      ${loc.instructions ? `<p class="ttd-result-note">${esc(loc.instructions)}</p>` : ''}
      ${office ? `<p class="ttd-office-note">● Oficina física disponible</p>` : ''}
    </div>
    <div class="ttd-result-actions">
      ${office && loc.maps_url ? `<a href="${esc(loc.maps_url)}" target="_blank" rel="noopener">Ver ubicación ↗</a>` : ''}
      ${ctx.booking_enabled && modes.length ? '<button id="ttd-open-booking" type="button">Agendar asesoría</button>' : ''}
    </div>`;
  result.querySelector('#ttd-open-booking')?.addEventListener('click', () => openBooking(loc));
  if (bookingSection && !bookingSection.classList.contains('ttd-hidden')) bookingSection.classList.add('ttd-hidden');
}

function buildBooking() {
  if (!ctx?.booking_enabled) return;
  const today = new Date();
  const max = addDays(today, Number(ctx.settings?.max_days_ahead) || 60);

  bookingSection = document.createElement('section');
  bookingSection.className = 'ttd-advisor-booking ttd-hidden';
  bookingSection.id = 'agenda';
  bookingSection.innerHTML = `
    <div class="ttd-advisor-section-head">
      <div><p>Agenda TTD</p><h2>Agenda una asesoría</h2></div><span>◫</span>
    </div>
    <div id="ttd-selected-city" class="ttd-selected-city"></div>
    <form id="ttd-booking-form" class="ttd-booking-grid">
      <label class="ttd-span-2">¿Sobre qué tema necesitas orientación?
        <select id="ttd-booking-service"><option value="">Asesoría general</option></select>
      </label>
      <div class="ttd-span-2">
        <label>¿Cómo prefieres la atención?</label>
        <div id="ttd-mode-row" class="ttd-mode-row"></div>
      </div>
      <label>Fecha<input id="ttd-booking-date" type="date" min="${dateISO(today)}" max="${dateISO(max)}" required></label>
      <div><label>Horario disponible</label><div id="ttd-slots" class="ttd-slot-wrap"><span class="ttd-slot-empty">Selecciona una fecha.</span></div></div>
      <label>Nombre<input id="ttd-customer-name" type="text" maxlength="120" autocomplete="name" required></label>
      <label>Teléfono / WhatsApp<input id="ttd-customer-phone" type="tel" maxlength="40" autocomplete="tel" required></label>
      <label>Correo electrónico <span class="ttd-optional">(opcional)</span><input id="ttd-customer-email" type="email" maxlength="160" autocomplete="email"></label>
      <label>Nota <span class="ttd-optional">(opcional)</span><input id="ttd-customer-notes" type="text" maxlength="300"></label>
      <div class="ttd-span-2">
        <button id="ttd-booking-submit" class="ttd-booking-submit" type="submit">Solicitar asesoría</button>
        <p id="ttd-booking-msg" class="ttd-booking-msg" aria-live="polite"></p>
        <div id="ttd-booking-success" class="ttd-booking-success ttd-hidden"></div>
      </div>
    </form>`;
  sectionAnchor()?.before(bookingSection);

  const serviceSel = bookingSection.querySelector('#ttd-booking-service');
  services
    .filter(x => x.is_visible !== false)
    .sort((a, b) => serviceRank(a.title) - serviceRank(b.title))
    .forEach(x => {
      const o = document.createElement('option');
      o.value = x.id;
      o.textContent = bookingServiceLabel(x.title);
      serviceSel.appendChild(o);
    });

  bookingSection.querySelector('#ttd-booking-date').addEventListener('change', e => loadSlots(e.target.value));
  bookingSection.querySelector('#ttd-booking-form').addEventListener('submit', submitBooking);
}

function openBooking(loc) {
  if (!bookingSection || !loc) return;
  selectedLocation = loc;
  const modes = locationModes(loc);
  selectedMode = modes[0] || '';
  selectedSlot = null;

  bookingSection.querySelector('#ttd-selected-city').innerHTML = `
    <span>Ciudad seleccionada</span>
    <strong>${esc(loc.city || loc.name)} · ${esc(loc.state || '')}</strong>
    ${loc.has_physical_office ? '<small>Oficina física disponible</small>' : ''}`;

  const row = bookingSection.querySelector('#ttd-mode-row');
  row.replaceChildren();
  modes.forEach((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ttd-mode-btn' + (i === 0 ? ' is-active' : '');
    b.textContent = modeLabels[m] || m;
    b.onclick = () => {
      selectedMode = m;
      selectedSlot = null;
      row.querySelectorAll('button').forEach(x => x.classList.toggle('is-active', x === b));
      clearSlots('Vuelve a elegir fecha para actualizar horarios.');
    };
    row.appendChild(b);
  });

  bookingSection.classList.remove('ttd-hidden');
  bookingSection.querySelector('#ttd-booking-success').classList.add('ttd-hidden');
  bookingSection.querySelector('#ttd-booking-msg').textContent = '';
  bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearSlots(text = 'Selecciona una fecha.') {
  selectedSlot = null;
  const wrap = bookingSection?.querySelector('#ttd-slots');
  if (wrap) wrap.innerHTML = `<span class="ttd-slot-empty">${esc(text)}</span>`;
}

async function loadSlots(date) {
  clearSlots('Cargando horarios…');
  if (!date) return;

  const { data, error } = await supabase.rpc('get_advisor_booking_slots', { p_slug: slug, p_date: date });
  const wrap = bookingSection.querySelector('#ttd-slots');
  wrap.replaceChildren();

  if (error) {
    wrap.innerHTML = '<span class="ttd-slot-empty">No fue posible consultar horarios.</span>';
    return;
  }
  const slots = Array.isArray(data) ? data : [];
  if (!slots.length) {
    wrap.innerHTML = '<span class="ttd-slot-empty">No hay horarios disponibles para esta fecha.</span>';
    return;
  }

  slots.forEach(slot => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ttd-slot';
    b.textContent = `${slot.start} – ${slot.end}`;
    b.onclick = () => {
      selectedSlot = slot;
      wrap.querySelectorAll('.ttd-slot').forEach(x => x.classList.toggle('is-active', x === b));
    };
    wrap.appendChild(b);
  });
}

async function submitBooking(e) {
  e.preventDefault();
  const root = bookingSection;
  const msg = root.querySelector('#ttd-booking-msg');
  const btn = root.querySelector('#ttd-booking-submit');
  msg.className = 'ttd-booking-msg';
  msg.textContent = '';

  if (!selectedLocation) {
    msg.classList.add('is-error');
    msg.textContent = 'Selecciona primero una ciudad.';
    return;
  }
  if (!selectedMode) {
    msg.classList.add('is-error');
    msg.textContent = 'Selecciona una forma de atención.';
    return;
  }
  if (!selectedSlot) {
    msg.classList.add('is-error');
    msg.textContent = 'Selecciona un horario disponible.';
    return;
  }

  const date = root.querySelector('#ttd-booking-date').value;
  const customerName = root.querySelector('#ttd-customer-name').value.trim();
  const waNumber = digits(profile?.whatsapp || profile?.phone);
  let waPopup = null;
  if (waNumber) {
    try {
      waPopup = window.open('about:blank', '_blank');
      if (waPopup) waPopup.opener = null;
    } catch {
      waPopup = null;
    }
  }

  btn.disabled = true;
  btn.textContent = 'Registrando…';

  const payload = {
    p_slug: slug,
    p_service_id: root.querySelector('#ttd-booking-service').value || null,
    p_location_id: selectedLocation.id,
    p_mode: selectedMode,
    p_date: date,
    p_start_time: selectedSlot.start,
    p_customer_name: customerName,
    p_customer_phone: root.querySelector('#ttd-customer-phone').value.trim(),
    p_customer_email: root.querySelector('#ttd-customer-email').value.trim() || null,
    p_customer_notes: root.querySelector('#ttd-customer-notes').value.trim() || null
  };

  const { data, error } = await supabase.rpc('request_advisor_appointment', payload);
  btn.disabled = false;
  btn.textContent = 'Solicitar asesoría';

  if (error) {
    try { waPopup?.close(); } catch {}
    msg.classList.add('is-error');
    msg.textContent = error.message || 'No fue posible registrar la solicitud.';
    await loadSlots(date);
    return;
  }

  const rawService = services.find(x => x.id === payload.p_service_id)?.title || 'Asesoría general';
  const service = bookingServiceLabel(rawService);
  const modeLabel = modeLabels[selectedMode];
  const when = `${mxDate(date)} · ${selectedSlot.start}`;
  const status = data?.status === 'confirmed' ? 'Confirmada' : 'Pendiente de confirmación';
  const place = `${selectedLocation.city || selectedLocation.name}, ${selectedLocation.state || ''}`;
  const confirmUrl = data?.manage_token ? `${CONFIRM_BASE_URL}?token=${encodeURIComponent(data.manage_token)}&tipo=asesor` : CONFIRM_BASE_URL;

  const waText = `Hola, mi nombre es: ${customerName}.\n\nAcabo de solicitar una asesoría desde TTD sobre: ${service}.\n\n📍 ${place}\n📅 ${when}\n💬 Modalidad: ${modeLabel}\n\nEstado: ${status}.\n\nConfirma aquí:\n${confirmUrl}`;

  const cal = calendarUrl(
    data.starts_at,
    data.ends_at,
    'CITA PARA ASESORÍA',
    `Cliente: ${customerName}. ${service}. Solicitud registrada en TTD. Estado: ${status}. Modalidad: ${modeLabel}.`,
    selectedLocation.address || place
  );
  const wa = whatsappUrl(waText);

  if (wa) {
    if (waPopup && !waPopup.closed) {
      try { waPopup.location.replace(wa); }
      catch { waPopup.location.href = wa; }
    } else {
      window.open(wa, '_blank', 'noopener');
    }
  } else {
    try { waPopup?.close(); } catch {}
  }

  const success = root.querySelector('#ttd-booking-success');
  success.classList.remove('ttd-hidden');
  success.innerHTML = `
    <h3>Solicitud registrada ✓</h3>
    <p><strong>${esc(status)}</strong><br>${esc(service)} · ${esc(place)} · ${esc(when)} · ${esc(modeLabel)}</p>
    <p><strong>No olvides el día y hora de tu cita.</strong><br>Guárdala en el calendario de tu teléfono.</p>
    <div class="ttd-booking-actions">
      <a class="is-secondary" href="${esc(cal)}" target="_blank" rel="noopener">Guardar en mi calendario</a>
    </div>`;
  success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  await loadSlots(date);
}

async function init() {
  if (!slug || location.pathname.toLowerCase().includes('/admin/')) return;
  ensureBookingThemeFix();

  const { data: p } = await supabase
    .from('advisor_profiles')
    .select('id,first_names,last_names,phone,whatsapp')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (!p) return;

  const [{ data: context, error: ctxError }, { data: s }] = await Promise.all([
    supabase.rpc('get_public_advisor_booking_context', { p_slug: slug }),
    supabase.from('advisor_services')
      .select('id,title,is_visible,sort_order')
      .eq('advisor_id', p.id)
      .eq('is_visible', true)
      .order('sort_order')
  ]);

  if (ctxError || !context) return;
  ctx = context;
  profile = p;
  services = s || [];
  renderCoverage();
  buildBooking();
}

init().catch(err => console.warn('TTD agenda:', err));