import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SUPABASE_CONFIG || {};
const supabase = createClient(cfg.url, cfg.publishableKey);
const basePath = '/admin/barberias/';
const raw = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : '';
const slug = decodeURIComponent(raw.replace(/^\/+|\/+$/g,''));
const cleanUrl = `${basePath}${encodeURIComponent(slug)}`;

document.body.classList.add('ttd-legacy-shell');

async function resolveAndBoot(){
  if (!slug) { location.replace(basePath); return; }
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) { location.replace(`${basePath}?login=1`); return; }
  const { data:profile, error } = await supabase.from('business_profiles').select('id,slug,vertical').eq('slug', slug).eq('vertical','beauty').maybeSingle();
  if (error || !profile) {
    const loading = document.getElementById('loading-panel');
    if (loading) loading.innerHTML = '<p>No fue posible encontrar esta barbería o tu cuenta no tiene acceso.</p><p><a href="/admin/barberias/">← Volver a Barberías</a></p>';
    return;
  }
  history.replaceState(history.state, '', `${cleanUrl}?id=${encodeURIComponent(profile.id)}`);
  await import('/assets/business-admin-v2.js?v=20260916-cleanroute1');
  const editor = document.getElementById('business-editor');
  const preview = document.getElementById('business-preview');
  const finish = () => {
    if (!editor || editor.classList.contains('is-hidden')) return false;
    history.replaceState(history.state, '', cleanUrl);
    if (preview) preview.href = `/barberias/?negocio=${encodeURIComponent(slug)}`;
    return true;
  };
  if (!finish()) {
    const observer = new MutationObserver(() => { if (finish()) observer.disconnect(); });
    observer.observe(editor || document.body, { attributes:true, attributeFilter:['class'], subtree:false });
    setTimeout(() => { observer.disconnect(); finish(); }, 12000);
  }
}

resolveAndBoot().catch(err => {
  console.warn('TTD ruta Barberías:', err);
  const loading = document.getElementById('loading-panel');
  if (loading) loading.innerHTML = '<p>No fue posible abrir esta barbería.</p><p><a href="/admin/barberias/">← Volver a Barberías</a></p>';
});
