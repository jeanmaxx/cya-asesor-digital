import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.SUPABASE_CONFIG || {};
const fallback = window.ADVISOR_FALLBACK || {};
const $ = (id) => document.getElementById(id);
const supabase = createClient(cfg.url, cfg.publishableKey);
let authMode = 'login';
let currentUser = null;
let currentProfile = null;
let currentServices = [];

function systemAdminTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setAdminTheme(theme, persist = false) {
  const effective = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = effective;
  const icon = $('admin-theme-icon');
  const button = $('admin-theme-toggle');
  if (icon) icon.textContent = effective === 'dark' ? '☀' : '☾';
  if (button) button.setAttribute('aria-label', effective === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  if (persist) localStorage.setItem('cya-admin-theme', effective);
}

const initialAdminTheme = localStorage.getItem('cya-admin-theme') || systemAdminTheme();
setAdminTheme(initialAdminTheme);

$('admin-theme-toggle')?.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme || systemAdminTheme();
  setAdminTheme(current === 'dark' ? 'light' : 'dark', true);
});

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
  await loadOwnServices();
}

function fillForm(profile) {
  $('first-names').value = profile.first_names || '';
  $('last-names').value = profile.last_names || '';
  $('title').value = profile.title || 'Asesor Previsional';
  $('company-name').value = profile.company_name || 'Casillas & Asociados';
  $('ally-label').value = profile.ally_label || 'Asesor Aliado';
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
  $('theme-mode').value = profile.theme_mode || 'system';
  const trustItems = Array.isArray(profile.trust_items) ? profile.trust_items : ['Atención personalizada', 'Acompañamiento', 'Información clara'];
  $('trust-item-1').value = trustItems[0] || '';
  $('trust-item-2').value = trustItems[1] || '';
  $('trust-item-3').value = trustItems[2] || '';
  $('closing-kicker-input').value = profile.closing_kicker || 'Orientación inicial';
  $('closing-title-input').value = profile.closing_title || 'Cuéntame tu caso';
  $('closing-text-input').value = profile.closing_text || '';
  $('closing-cta-input').value = profile.closing_cta || 'Escribirme por WhatsApp';
  $('is-published').checked = Boolean(profile.is_published);
  $('photo-preview').src = profile.photo_path ? storagePublicUrl(profile.photo_path) : '../assets/profile-placeholder.svg';
  $('logo-preview').src = profile.logo_path ? storagePublicUrl(profile.logo_path) : '../assets/logo-placeholder.svg';
  updatePreviewLink();
}

async function loadOwnServices() {
  const { data, error } = await supabase
    .from('advisor_services')
    .select('*')
    .eq('advisor_id', currentProfile.id)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  currentServices = data || [];
  renderServicesEditor(currentServices);
}

function escapeText(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderServicesEditor(services) {
  const editor = $('services-editor');
  editor.replaceChildren();
  services.forEach((service, index) => {
    const card = document.createElement('section');
    card.className = 'service-editor-card';
    card.dataset.id = service.id;
    const requirements = Array.isArray(service.requirements) ? service.requirements.join('\n') : '';
    card.innerHTML = `
      <div class="service-editor-card__header">
        <strong>Servicio ${index + 1}</strong>
        <label class="mini-switch"><input class="service-visible" type="checkbox" ${service.is_visible !== false ? 'checked' : ''}/> Visible</label>
      </div>
      <label>Título
        <input class="service-title" type="text" maxlength="140" value="${escapeText(service.title)}" />
      </label>
      <label>Descripción breve
        <textarea class="service-summary" rows="3" maxlength="320">${escapeText(service.summary)}</textarea>
      </label>
      <label>Requisitos / puntos básicos
        <textarea class="service-requirements" rows="5">${escapeText(requirements)}</textarea>
      </label>
      <label>Nota adicional
        <textarea class="service-notice" rows="2" maxlength="320">${escapeText(service.notice || '')}</textarea>
      </label>
      <label>Texto del botón
        <input class="service-cta-input" type="text" maxlength="100" value="${escapeText(service.cta || 'Quiero recibir información')}" />
      </label>
    `;
    editor.appendChild(card);
  });
}

async function saveServices() {
  const cards = [...document.querySelectorAll('.service-editor-card')];
  for (const card of cards) {
    const requirements = card.querySelector('.service-requirements').value
      .split('\n').map((line) => line.trim()).filter(Boolean);
    const payload = {
      title: card.querySelector('.service-title').value.trim(),
      summary: card.querySelector('.service-summary').value.trim(),
      requirements,
      notice: card.querySelector('.service-notice').value.trim() || null,
      cta: card.querySelector('.service-cta-input').value.trim() || 'Quiero recibir información',
      is_visible: card.querySelector('.service-visible').checked
    };
    const { error } = await supabase
      .from('advisor_services')
      .update(payload)
      .eq('id', card.dataset.id)
      .eq('advisor_id', currentProfile.id);
    if (error) throw error;
  }
}

function updatePreviewLink() {
  const slug = $('slug').value.trim() || currentProfile?.slug || cfg.defaultSlug;
  $('profile-preview-link').href = `../?asesor=${encodeURIComponent(slug)}`;
}

$('slug').addEventListener('input', updatePreviewLink);

$('first-names').addEventListener('blur', () => {
  if ($('slug').value.trim()) return;
  const candidate = slugify(`${$('first-names').value} ${$('last-names').value}`);
  if (candidate) {
    $('slug').value = candidate;
    updatePreviewLink();
  }
});
$('last-names').addEventListener('blur', () => {
  if ($('slug').value.trim()) return;
  const candidate = slugify(`${$('first-names').value} ${$('last-names').value}`);
  if (candidate) {
    $('slug').value = candidate;
    updatePreviewLink();
  }
});

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
      ally_label: $('ally-label').value.trim() || 'Asesor Aliado',
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
      theme_mode: $('theme-mode').value,
      trust_items: [
        $('trust-item-1').value.trim(),
        $('trust-item-2').value.trim(),
        $('trust-item-3').value.trim()
      ].filter(Boolean),
      closing_kicker: $('closing-kicker-input').value.trim() || 'Orientación inicial',
      closing_title: $('closing-title-input').value.trim() || 'Cuéntame tu caso',
      closing_text: $('closing-text-input').value.trim(),
      closing_cta: $('closing-cta-input').value.trim() || 'Escribirme por WhatsApp',
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
    await saveServices();
    fillForm(data);
    await loadOwnServices();
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
