import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SUPABASE_CONFIG || {};
const $ = (id) => document.getElementById(id);
const supabase = createClient(cfg.url, cfg.publishableKey);
let authMode = 'login';
let currentUser = null;
let currentProfile = null;

function setMessage(id, text = '', type = '') {
  const el = $(id);
  el.textContent = text;
  el.classList.toggle('is-error', type === 'error');
  el.classList.toggle('is-success', type === 'success');
}

function setAuthMode(mode) {
  authMode = mode;
  $('tab-login').classList.toggle('is-active', mode === 'login');
  $('tab-signup').classList.toggle('is-active', mode === 'signup');
  $('auth-submit').textContent = mode === 'login' ? 'Ingresar' : 'Crear acceso';
  $('auth-password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  setMessage('auth-message');
}

$('tab-login').addEventListener('click', () => setAuthMode('login'));
$('tab-signup').addEventListener('click', () => setAuthMode('signup'));

$('auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('auth-message', 'Procesando…');
  const email = $('auth-email').value.trim();
  const password = $('auth-password').value;

  try {
    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) {
        setMessage('auth-message', 'Acceso creado. Revisa tu correo para confirmar la cuenta y después vuelve a ingresar.', 'success');
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    await bootAuthenticated();
  } catch (error) {
    setMessage('auth-message', error.message || 'No fue posible completar el acceso.', 'error');
  }
});

$('signout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  $('editor-panel').classList.add('is-hidden');
  $('auth-panel').classList.remove('is-hidden');
  setMessage('auth-message', 'Sesión cerrada.', 'success');
});

function storagePublicUrl(path) {
  if (!path) return '';
  return `${cfg.url}/storage/v1/object/public/${cfg.storageBucket}/${path}`;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function loadOwnProfile() {
  const { data, error } = await supabase
    .from('advisor_profiles')
    .select('*')
    .eq('user_id', currentUser.id)
    .single();
  if (error) throw error;
  currentProfile = data;
  fillForm(data);
}

function fillForm(profile) {
  $('first-names').value = profile.first_names || '';
  $('last-names').value = profile.last_names || '';
  $('title').value = profile.title || 'Asesor Previsional';
  $('company-name').value = profile.company_name || 'Casillas & Asociados';
  $('bio').value = profile.bio || '';
  $('slug').value = profile.slug?.startsWith('advisor-') ? '' : (profile.slug || '');
  $('phone').value = profile.phone || '';
  $('whatsapp').value = profile.whatsapp || '';
  $('instagram').value = profile.instagram_url || '';
  $('facebook').value = profile.facebook_url || '';
  $('primary-color').value = profile.primary_color || '#0E223D';
  $('accent-color').value = profile.accent_color || '#C9A96E';
  $('background-color').value = profile.background_color || '#F7F5F0';
  $('surface-color').value = profile.surface_color || '#FFFFFF';
  $('font-family').value = profile.font_family || 'helvetica';
  $('is-published').checked = Boolean(profile.is_published);
  $('photo-preview').src = profile.photo_path ? storagePublicUrl(profile.photo_path) : '../assets/profile-placeholder.svg';
  $('logo-preview').src = profile.logo_path ? storagePublicUrl(profile.logo_path) : '../assets/logo-placeholder.svg';
  updatePreviewLink();
}

function updatePreviewLink() {
  const slug = $('slug').value.trim() || currentProfile?.slug || cfg.defaultSlug;
  $('profile-preview-link').href = `../?asesor=${encodeURIComponent(slug)}`;
}

$('slug').addEventListener('input', updatePreviewLink);

function setSuggestedSlug() {
  if ($('slug').value.trim()) return;
  const candidate = slugify(`${$('first-names').value} ${$('last-names').value}`);
  if (candidate) {
    $('slug').value = candidate;
    updatePreviewLink();
  }
}

$('first-names').addEventListener('blur', setSuggestedSlug);
$('last-names').addEventListener('blur', setSuggestedSlug);
$('photo-file').addEventListener('change', (event) => previewLocalFile(event.target.files?.[0], $('photo-preview')));
$('logo-file').addEventListener('change', (event) => previewLocalFile(event.target.files?.[0], $('logo-preview')));

function previewLocalFile(file, img) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  img.src = url;
  img.onload = () => URL.revokeObjectURL(url);
}

function fileExtension(file) {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  const map = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/svg+xml':'svg' };
  return map[file.type] || 'bin';
}

async function uploadAsset(file, kind) {
  if (!file) return null;
  if (file.size > 5 * 1024 * 1024) throw new Error('Cada imagen debe pesar menos de 5 MB.');
  const path = `${currentUser.id}/${kind}-${Date.now()}.${fileExtension(file)}`;
  const { error } = await supabase.storage
    .from(cfg.storageBucket)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

$('profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('save-message', 'Guardando cambios…');
  $('save-profile').disabled = true;

  try {
    const firstNames = $('first-names').value.trim();
    const lastNames = $('last-names').value.trim();
    const slug = $('slug').value.trim() || slugify(`${firstNames} ${lastNames}`);
    if (!slug) throw new Error('Define un identificador válido para tu página.');

    const photoPath = await uploadAsset($('photo-file').files?.[0], 'profile');
    const logoPath = await uploadAsset($('logo-file').files?.[0], 'logo');

    const payload = {
      slug,
      first_names: firstNames,
      last_names: lastNames,
      title: $('title').value.trim(),
      company_name: $('company-name').value.trim(),
      phone: $('phone').value.trim(),
      whatsapp: $('whatsapp').value.trim(),
      instagram_url: $('instagram').value.trim() || null,
      facebook_url: $('facebook').value.trim() || null,
      bio: $('bio').value.trim() || null,
      primary_color: $('primary-color').value,
      accent_color: $('accent-color').value,
      background_color: $('background-color').value,
      surface_color: $('surface-color').value,
      font_family: $('font-family').value,
      is_published: $('is-published').checked,
      ...(photoPath ? { photo_path: photoPath } : {}),
      ...(logoPath ? { logo_path: logoPath } : {})
    };

    const { data, error } = await supabase
      .from('advisor_profiles')
      .update(payload)
      .eq('user_id', currentUser.id)
      .select('*')
      .single();
    if (error) throw error;

    currentProfile = data;
    fillForm(data);
    $('photo-file').value = '';
    $('logo-file').value = '';
    setMessage('save-message', 'Cambios guardados correctamente.', 'success');
  } catch (error) {
    setMessage('save-message', error.message || 'No fue posible guardar los cambios.', 'error');
  } finally {
    $('save-profile').disabled = false;
  }
});

async function bootAuthenticated() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return;
  currentUser = user;
  $('auth-panel').classList.add('is-hidden');
  $('editor-panel').classList.remove('is-hidden');
  try {
    await loadOwnProfile();
  } catch (error) {
    setMessage('save-message', 'Tu cuenta existe, pero no fue posible cargar el perfil. Recarga la página en unos segundos.', 'error');
  }
}

(async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) await bootAuthenticated();
})();
