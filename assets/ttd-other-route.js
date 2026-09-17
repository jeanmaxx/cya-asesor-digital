import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SUPABASE_CONFIG || {};
const supabase = createClient(cfg.url, cfg.publishableKey);
const basePath = '/admin/otros/';
const raw = location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length) : '';
const slug = decodeURIComponent(raw.replace(/^\/+|\/+$/g,''));
const cleanUrl = `${basePath}${encodeURIComponent(slug)}`;

document.body.classList.add('ttd-legacy-shell');

async function resolveAndBoot(){
  if (!slug) { location.replace(basePath); return; }
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) { location.replace(`${basePath}?login=1`); return; }
  const { data:profile, error } = await supabase.from('business_profiles').select('id,slug,vertical').eq('slug', slug).eq('vertical','other').maybeSingle();
  if (error || !profile) {
    const loading = document.getElementById('loading-panel');
    if (loading) loading.innerHTML = '<p>No fue posible encontrar este negocio o tu cuenta no tiene acceso.</p><p><a href="/admin/otros/">← Volver a Otros Negocios</a></p>';
    return;
  }
  history.replaceState(history.state, '', `${cleanUrl}?id=${encodeURIComponent(profile.id)}`);
  await import('/assets/other-admin.js?v=20260916-cleanroute1');
  const editor = document.getElementById('other-editor');
  const preview = document.getElementById('other-preview');
  const finish = () => {
    if (!editor || editor.classList.contains('is-hidden')) return false;
    history.replaceState(history.state, '', cleanUrl);
    if (preview) preview.href = `/otros/?negocio=${encodeURIComponent(slug)}`;
    return true;
  };
  if (!finish()) {
    const observer = new MutationObserver(() => { if (finish()) observer.disconnect(); });
    observer.observe(editor || document.body, { attributes:true, attributeFilter:['class'], subtree:false });
    setTimeout(() => { observer.disconnect(); finish(); }, 12000);
  }
}

resolveAndBoot().catch(err => {
  console.warn('TTD ruta Otros Negocios:', err);
  const loading = document.getElementById('loading-panel');
  if (loading) loading.innerHTML = '<p>No fue posible abrir este negocio.</p><p><a href="/admin/otros/">← Volver a Otros Negocios</a></p>';
});
