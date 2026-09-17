import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SUPABASE_CONFIG || {};
const supabase = createClient(cfg.url, cfg.publishableKey);
const $ = id => document.getElementById(id);

function initials(email='') {
  const base = email.split('@')[0] || 'TTD';
  return base.split(/[._-]+/).map(x => x[0] || '').join('').slice(0,2).toUpperCase() || 'TT';
}
function showLogin(show) {
  $('ttd-login-screen').hidden = !show;
  $('ttd-admin-app').hidden = show;
}
function setError(text='') { $('ttd-login-error').textContent = text; }
async function loadCounts() {
  const [{ data: personal, error: e1 }, { data: barberias, error: e2 }, { data: otros, error: e3 }] = await Promise.all([
    supabase.from('advisor_profiles').select('id', { count:'exact' }).eq('product_type','advisor'),
    supabase.from('business_profiles').select('id', { count:'exact' }).eq('vertical','beauty'),
    supabase.from('business_profiles').select('id', { count:'exact' }).eq('vertical','other')
  ]);
  if (e1 || e2 || e3) throw (e1 || e2 || e3);
  const p = personal?.length || 0, b = barberias?.length || 0, o = otros?.length || 0;
  $('metric-personales').textContent = p;
  $('metric-barberias').textContent = b;
  $('metric-otros').textContent = o;
  $('card-personales-count').textContent = `${p} tarjeta${p===1?'':'s'}`;
  $('card-barberias-count').textContent = `${b} negocio${b===1?'':'s'}`;
  $('card-otros-count').textContent = `${o} negocio${o===1?'':'s'}`;
}
async function boot() {
  const { data:{ user }, error } = await supabase.auth.getUser();
  if (error || !user) { showLogin(true); return; }
  showLogin(false);
  $('ttd-session-user').textContent = user.email || '';
  $('ttd-avatar').textContent = initials(user.email);
  try { await loadCounts(); }
  catch (err) {
    console.warn('TTD Admin:', err);
    ['metric-personales','metric-barberias','metric-otros'].forEach(id => $(id).textContent = '—');
  }
}

$('ttd-login-form').addEventListener('submit', async e => {
  e.preventDefault(); setError('');
  const email = $('ttd-login-email').value.trim();
  const password = $('ttd-login-password').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { setError('No fue posible iniciar sesión. Verifica tus datos.'); return; }
  await boot();
});
$('ttd-avatar').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

const { data:{ session } } = await supabase.auth.getSession();
if (session) await boot(); else showLogin(true);
