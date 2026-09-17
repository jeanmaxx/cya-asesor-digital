import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SUPABASE_CONFIG || {};
const supabase = createClient(cfg.url, cfg.publishableKey);
const token = new URLSearchParams(location.search).get('token');
const $ = id => document.getElementById(id);
let appointment = null;
let business = null;
let service = null;

function formatDateTime(v) {
  return new Intl.DateTimeFormat('es-MX', {
    day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit',
    hour12:false, timeZone:'America/Mexico_City'
  }).format(new Date(v));
}
function compact(v) { return new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'); }
function statusLabel(v) { return ({requested:'Pendiente de confirmación',confirmed:'Confirmada',rejected:'Rechazada',completed:'Completada',cancelled:'Cancelada',no_show:'No asistió'})[v] || v; }
function calendarUrl() {
  const title = `CITA — ${business.business_name}${service?.name ? ` · ${service.name}` : ''}`;
  const details = `Cliente: ${appointment.customer_name}. Teléfono: ${appointment.customer_phone}. Cita confirmada desde TTD.`;
  const where = business.location_mode === 'remote' ? 'Atención remota' : (business.address || business.location_short || '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${compact(appointment.starts_at)}/${compact(appointment.ends_at)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(where)}`;
}
function show(id) { ['confirm-loading','confirm-login','confirm-content','confirm-denied'].forEach(x => $(x).hidden = x !== id); }

async function loadAppointment() {
  if (!token) { show('confirm-denied'); return; }
  const { data:a, error } = await supabase.from('business_appointments').select('*').eq('manage_token', token).maybeSingle();
  if (error || !a) { show('confirm-denied'); return; }
  appointment = a;
  const [{ data:b }, { data:s }] = await Promise.all([
    supabase.from('business_profiles').select('id,business_name,address,location_short,location_mode').eq('id', a.business_id).maybeSingle(),
    a.service_id ? supabase.from('business_services').select('id,name').eq('id', a.service_id).maybeSingle() : Promise.resolve({ data:null })
  ]);
  if (!b) { show('confirm-denied'); return; }
  business = b;
  service = s;
  render();
  show('confirm-content');
}

function render() {
  $('confirm-business').textContent = business.business_name;
  $('confirm-details').innerHTML = `
    <div><span>Cliente</span><strong>${appointment.customer_name}</strong></div>
    <div><span>Servicio</span><strong>${service?.name || 'Servicio'}</strong></div>
    <div><span>Fecha y hora</span><strong>${formatDateTime(appointment.starts_at)}</strong></div>
    <div><span>Teléfono</span><strong>${appointment.customer_phone}</strong></div>
    <div><span>Estado</span><strong>${statusLabel(appointment.status)}</strong></div>`;
  $('confirm-accept').hidden = appointment.status === 'confirmed' || appointment.status === 'completed';
  $('confirm-reject').hidden = ['rejected','cancelled','completed'].includes(appointment.status);
  const cal = $('confirm-calendar');
  cal.hidden = appointment.status !== 'confirmed';
  if (!cal.hidden) cal.href = calendarUrl();
}

async function setStatus(status) {
  $('confirm-message').textContent = 'Actualizando…';
  const { data, error } = await supabase.from('business_appointments').update({ status }).eq('id', appointment.id).select('*').single();
  if (error) { $('confirm-message').textContent = error.message || 'No fue posible actualizar la cita.'; return; }
  appointment = data;
  $('confirm-message').textContent = status === 'confirmed' ? 'Cita confirmada.' : 'Cita rechazada.';
  render();
}

$('confirm-login-form').addEventListener('submit', async e => {
  e.preventDefault();
  $('confirm-login-error').textContent = '';
  const { error } = await supabase.auth.signInWithPassword({ email:$('confirm-email').value.trim(), password:$('confirm-password').value });
  if (error) { $('confirm-login-error').textContent = 'No fue posible iniciar sesión. Verifica tus datos.'; return; }
  show('confirm-loading');
  await loadAppointment();
});
$('confirm-accept').addEventListener('click', () => setStatus('confirmed'));
$('confirm-reject').addEventListener('click', () => setStatus('rejected'));

async function init() {
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) { show('confirm-login'); return; }
  await loadAppointment();
}
init().catch(() => show('confirm-denied'));
