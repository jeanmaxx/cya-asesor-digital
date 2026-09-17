import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SUPABASE_CONFIG || {};
const supabase = createClient(cfg.url, cfg.publishableKey);
const params = new URLSearchParams(location.search);
const token = params.get('token');
const hintedType = params.get('tipo');
const $ = id => document.getElementById(id);

let appointment = null;
let account = null;
let service = null;
let locationInfo = null;
let appointmentType = null;

function formatDateTime(v) {
  return new Intl.DateTimeFormat('es-MX', {
    day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit',
    hour12:false, timeZone:'America/Mexico_City'
  }).format(new Date(v));
}
function compact(v) { return new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'); }
function statusLabel(v) {
  return ({
    requested:'Pendiente de confirmación',
    confirmed:'Confirmada',
    rejected:'Rechazada',
    rescheduled:'Reprogramada',
    completed:'Completada',
    cancelled:'Cancelada',
    no_show:'No asistió'
  })[v] || v;
}
function accountName() {
  if (appointmentType === 'business') return account?.business_name || 'Negocio';
  const full = `${account?.first_names || ''} ${account?.last_names || ''}`.trim();
  return full || account?.title || 'Asesor';
}
function serviceName() {
  return appointmentType === 'business' ? (service?.name || 'Servicio') : (service?.title || 'Asesoría general');
}
function appointmentWhere() {
  if (appointmentType === 'business') {
    return account?.location_mode === 'remote' ? 'Atención remota' : (account?.address || account?.location_short || '');
  }
  return locationInfo?.address || [locationInfo?.city, locationInfo?.state].filter(Boolean).join(', ') || 'Atención acordada';
}
function calendarUrl() {
  const title = appointmentType === 'business'
    ? `CITA — ${accountName()}${serviceName() ? ` · ${serviceName()}` : ''}`
    : `CITA PARA ASESORÍA — ${serviceName()}`;
  const details = `Cliente: ${appointment.customer_name}. Teléfono: ${appointment.customer_phone}. Cita confirmada desde TTD.`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${compact(appointment.starts_at)}/${compact(appointment.ends_at)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(appointmentWhere())}`;
}
function show(id) {
  ['confirm-loading','confirm-login','confirm-content','confirm-denied'].forEach(x => $(x).hidden = x !== id);
}
function setAdminLink() {
  const link = $('confirm-admin-link');
  if (!link) return;
  link.href = appointmentType === 'business' ? '../admin/esteticas.html' : '../admin/';
  link.textContent = appointmentType === 'business' ? 'Abrir panel del negocio' : 'Abrir panel TTD';
}

async function loadBusinessAppointment() {
  const { data:a, error } = await supabase.from('business_appointments').select('*').eq('manage_token', token).maybeSingle();
  if (error || !a) return false;
  appointment = a;
  appointmentType = 'business';
  const [{ data:b }, { data:s }] = await Promise.all([
    supabase.from('business_profiles').select('id,business_name,address,location_short,location_mode').eq('id', a.business_id).maybeSingle(),
    a.service_id ? supabase.from('business_services').select('id,name').eq('id', a.service_id).maybeSingle() : Promise.resolve({ data:null })
  ]);
  if (!b) return false;
  account = b;
  service = s;
  locationInfo = null;
  return true;
}

async function loadAdvisorAppointment() {
  const { data:a, error } = await supabase.from('advisor_appointments').select('*').eq('public_token', token).maybeSingle();
  if (error || !a) return false;
  appointment = a;
  appointmentType = 'advisor';
  const [{ data:p }, { data:s }, { data:l }] = await Promise.all([
    supabase.from('advisor_profiles').select('id,first_names,last_names,title').eq('id', a.advisor_id).maybeSingle(),
    a.service_id ? supabase.from('advisor_services').select('id,title').eq('id', a.service_id).maybeSingle() : Promise.resolve({ data:null }),
    a.location_id ? supabase.from('advisor_locations').select('id,name,city,state,address,maps_url').eq('id', a.location_id).maybeSingle() : Promise.resolve({ data:null })
  ]);
  if (!p) return false;
  account = p;
  service = s;
  locationInfo = l;
  return true;
}

async function loadAppointment() {
  if (!token) { show('confirm-denied'); return; }
  let found = false;
  if (hintedType === 'asesor') {
    found = await loadAdvisorAppointment();
    if (!found) found = await loadBusinessAppointment();
  } else {
    found = await loadBusinessAppointment();
    if (!found) found = await loadAdvisorAppointment();
  }
  if (!found) { show('confirm-denied'); return; }
  render();
  show('confirm-content');
}

function render() {
  $('confirm-business').textContent = accountName();
  $('confirm-details').innerHTML = `
    <div><span>Cliente</span><strong>${appointment.customer_name}</strong></div>
    <div><span>${appointmentType === 'advisor' ? 'Asesoría' : 'Servicio'}</span><strong>${serviceName()}</strong></div>
    <div><span>Fecha y hora</span><strong>${formatDateTime(appointment.starts_at)}</strong></div>
    <div><span>Teléfono</span><strong>${appointment.customer_phone}</strong></div>
    ${appointmentType === 'advisor' && locationInfo ? `<div><span>Ciudad</span><strong>${[locationInfo.city, locationInfo.state].filter(Boolean).join(', ')}</strong></div>` : ''}
    <div><span>Estado</span><strong>${statusLabel(appointment.status)}</strong></div>`;
  $('confirm-accept').hidden = appointment.status === 'confirmed' || appointment.status === 'completed';
  $('confirm-reject').hidden = ['rejected','cancelled','completed'].includes(appointment.status);
  const cal = $('confirm-calendar');
  cal.hidden = appointment.status !== 'confirmed';
  if (!cal.hidden) cal.href = calendarUrl();
  setAdminLink();
}

async function setStatus(status) {
  $('confirm-message').textContent = 'Actualizando…';
  const table = appointmentType === 'business' ? 'business_appointments' : 'advisor_appointments';
  const { data, error } = await supabase.from(table).update({ status }).eq('id', appointment.id).select('*').single();
  if (error) {
    $('confirm-message').textContent = error.message || 'No fue posible actualizar la cita.';
    return;
  }
  appointment = data;
  $('confirm-message').textContent = status === 'confirmed' ? 'Cita confirmada.' : 'Cita rechazada.';
  render();
}

$('confirm-login-form').addEventListener('submit', async e => {
  e.preventDefault();
  $('confirm-login-error').textContent = '';
  const { error } = await supabase.auth.signInWithPassword({
    email:$('confirm-email').value.trim(),
    password:$('confirm-password').value
  });
  if (error) {
    $('confirm-login-error').textContent = 'No fue posible iniciar sesión. Verifica tus datos.';
    return;
  }
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
