import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SUPABASE_CONFIG || {};
const supabase = createClient(cfg.url, cfg.publishableKey);
const businessId = new URLSearchParams(location.search).get('id');
const esc = v => String(v ?? '')
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
let profile = null;
let services = [];

function formatDateTime(v) {
  if (!v) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit',
    hour12:false, timeZone:'America/Mexico_City'
  }).format(new Date(v));
}
function compactDate(v) { return new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'); }
function calendarUrl(a, serviceName) {
  const title = `CITA — ${profile?.business_name || 'TTD'}${serviceName ? ` · ${serviceName}` : ''}`;
  const details = `Cliente: ${a.customer_name}. Teléfono: ${a.customer_phone}. Cita confirmada desde TTD.`;
  const where = profile?.location_mode === 'remote' ? 'Atención remota' : (profile?.address || profile?.location_short || '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${compactDate(a.starts_at)}/${compactDate(a.ends_at)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(where)}`;
}
function serviceName(id) { return services.find(s => s.id === id)?.name || 'Servicio'; }
function statusLabel(s) {
  return {requested:'Pendiente',confirmed:'Confirmada',rejected:'Rechazada',completed:'Completada',cancelled:'Cancelada',no_show:'No asistió'}[s] || s;
}

function injectLocationMode() {
  const address = document.getElementById('b-address');
  const maps = document.getElementById('b-maps');
  if (!address || !maps || document.getElementById('b-location-mode')) return;
  const addressLabel = address.closest('label');
  const fieldset = addressLabel?.closest('fieldset');
  if (!fieldset) return;

  const wrap = document.createElement('div');
  wrap.className = 'ttd-business-location-mode';
  wrap.innerHTML = `
    <label>Tipo de ubicación
      <select id="b-location-mode">
        <option value="single_branch">Sucursal única</option>
        <option value="remote">Solo atención remota</option>
        <option value="multi_area">Varias zonas de atención</option>
      </select>
    </label>
    <p id="b-location-mode-note" class="hint"></p>`;
  addressLabel.before(wrap);
  const sel = document.getElementById('b-location-mode');
  sel.value = profile?.location_mode || 'single_branch';

  function apply() {
    const mode = sel.value;
    const showOffice = mode === 'single_branch';
    addressLabel.hidden = !showOffice;
    maps.closest('label').hidden = !showOffice;
    document.getElementById('b-location-mode-note').textContent = mode === 'single_branch'
      ? 'Sucursal única: solo necesitas dirección y enlace de Google Maps.'
      : mode === 'remote'
        ? 'Atención remota: la tarjeta no mostrará una dirección física.'
        : 'La estructura multi-ciudad queda reservada para negocios que la necesiten más adelante.';
  }
  sel.addEventListener('change', async () => {
    apply();
    const { error } = await supabase.from('business_profiles').update({ location_mode: sel.value }).eq('id', businessId);
    const msg = document.getElementById('business-save-message');
    if (msg) msg.textContent = error ? 'No se pudo actualizar el tipo de ubicación.' : 'Tipo de ubicación actualizado.';
  });
  apply();
}

function injectAppointmentsPanel() {
  if (document.getElementById('ttd-business-appointments-fieldset')) return;
  const bookingToggle = document.getElementById('b-booking-enabled');
  const agenda = bookingToggle?.closest('fieldset');
  if (!agenda) return;
  const oldHint = [...agenda.querySelectorAll('.hint')].at(-1);
  if (oldHint) oldHint.textContent = 'Las solicitudes quedan registradas en TTD, bloquean el horario mientras están pendientes y pueden confirmarse desde el enlace seguro o desde este panel.';

  const fieldset = document.createElement('fieldset');
  fieldset.id = 'ttd-business-appointments-fieldset';
  fieldset.innerHTML = `
    <legend>Solicitudes de cita</legend>
    <div class="ttd-business-appt-toolbar">
      <p class="hint">Administra las citas recientes o abre su enlace seguro de confirmación.</p>
      <button id="ttd-refresh-business-appts" class="secondary-btn" type="button">Actualizar</button>
    </div>
    <div id="ttd-business-appointments" class="ttd-business-appointments"><p class="hint">Cargando citas…</p></div>`;
  agenda.after(fieldset);
  document.getElementById('ttd-refresh-business-appts').addEventListener('click', loadAppointments);
}

async function updateStatus(id, status) {
  const { error } = await supabase.from('business_appointments').update({ status }).eq('id', id).eq('business_id', businessId);
  if (error) {
    alert(error.message || 'No fue posible actualizar la cita.');
    return;
  }
  await loadAppointments();
}

async function loadAppointments() {
  const root = document.getElementById('ttd-business-appointments');
  if (!root || !businessId) return;
  root.innerHTML = '<p class="hint">Cargando citas…</p>';
  const { data, error } = await supabase.from('business_appointments')
    .select('*').eq('business_id', businessId).order('starts_at', { ascending:false }).limit(40);
  if (error) {
    root.innerHTML = `<p class="message is-error">${esc(error.message)}</p>`;
    return;
  }
  const rows = data || [];
  if (!rows.length) {
    root.innerHTML = '<p class="hint">Aún no hay solicitudes registradas.</p>';
    return;
  }
  root.replaceChildren();
  rows.forEach(a => {
    const service = serviceName(a.service_id);
    const card = document.createElement('article');
    card.className = 'ttd-business-appt-card';
    const manageUrl = `${location.origin}/confirmar/?token=${encodeURIComponent(a.manage_token)}`;
    card.innerHTML = `
      <div class="ttd-business-appt-main">
        <div><strong>${esc(a.customer_name)}</strong><span>${esc(service)} · ${esc(formatDateTime(a.starts_at))}</span><small>${esc(a.customer_phone)}${a.customer_email ? ` · ${esc(a.customer_email)}` : ''}</small></div>
        <span class="ttd-business-status" data-status="${esc(a.status)}">${esc(statusLabel(a.status))}</span>
      </div>
      <div class="ttd-business-appt-actions">
        ${a.status !== 'confirmed' ? '<button type="button" data-action="confirmed">Confirmar</button>' : ''}
        ${!['rejected','cancelled','completed'].includes(a.status) ? '<button type="button" data-action="rejected" class="is-danger">Rechazar</button>' : ''}
        <a href="${esc(manageUrl)}" target="_blank" rel="noopener">Abrir confirmación ↗</a>
        ${a.status === 'confirmed' ? `<a href="${esc(calendarUrl(a, service))}" target="_blank" rel="noopener">Agregar a Google Calendar ↗</a>` : ''}
      </div>`;
    card.querySelectorAll('button[data-action]').forEach(b => b.addEventListener('click', () => updateStatus(a.id, b.dataset.action)));
    root.appendChild(card);
  });
}

async function boot() {
  if (!businessId || !location.pathname.includes('/admin/negocio')) return;
  const { data:{ user } } = await supabase.auth.getUser();
  if (!user) return;
  const [{ data:p, error }, { data:s }] = await Promise.all([
    supabase.from('business_profiles').select('*').eq('id', businessId).maybeSingle(),
    supabase.from('business_services').select('id,name').eq('business_id', businessId).order('sort_order')
  ]);
  if (error || !p) return;
  profile = p;
  services = s || [];

  const wait = setInterval(() => {
    if (document.getElementById('b-address') && document.getElementById('b-booking-enabled')) {
      clearInterval(wait);
      injectLocationMode();
      injectAppointmentsPanel();
      loadAppointments();
    }
  }, 100);
  setTimeout(() => clearInterval(wait), 10000);
}

if (document.readyState === 'complete') boot().catch(console.warn);
else window.addEventListener('load', () => boot().catch(err => console.warn('TTD business admin booking:', err)), { once:true });
