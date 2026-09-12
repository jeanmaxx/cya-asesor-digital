import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sbCfg = window.SUPABASE_CONFIG || {};
const fallback = window.ADVISOR_FALLBACK || {};
const fallbackServices = window.ADVISOR_FALLBACK_SERVICES || [];
const $ = (id) => document.getElementById(id);

const requestedSlug = new URLSearchParams(window.location.search).get('asesor') || sbCfg.defaultSlug || fallback.slug;
const supabase = sbCfg.url && sbCfg.publishableKey
  ? createClient(sbCfg.url, sbCfg.publishableKey)
  : null;

function safeHex(value, backup) {
  return /^#[0-9A-Fa-f]{6}$/.test(value || '') ? value : backup;
}

function fontStack(key) {
  const stacks = {
    helvetica: '"Helvetica Neue", Helvetica, Arial, Tahoma, sans-serif',
    tahoma: 'Tahoma, Verdana, Arial, sans-serif',
    arial: 'Arial, Helvetica, sans-serif',
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  };
  return stacks[key] || stacks.helvetica;
}

function toMxE164(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `52${digits}`;
  if (digits.startsWith('52') && digits.length >= 12) return digits;
  return digits;
}

function displayPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const local = digits.startsWith('52') && digits.length >= 12 ? digits.slice(-10) : digits;
  if (local.length === 10) return `${local.slice(0,3)} ${local.slice(3,6)} ${local.slice(6)}`;
  return raw || '';
}

function storagePublicUrl(path) {
  if (!path || !sbCfg.url || !sbCfg.storageBucket) return '';
  return `${sbCfg.url}/storage/v1/object/public/${sbCfg.storageBucket}/${path}`;
}

function whatsappUrl(profile, message) {
  const number = toMxE164(profile.whatsapp || profile.phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function applyTheme(profile) {
  const root = document.documentElement;
  root.style.setProperty('--navy', safeHex(profile.primary_color, '#0E223D'));
  root.style.setProperty('--gold', safeHex(profile.accent_color, '#C9A96E'));
  root.style.setProperty('--paper', safeHex(profile.background_color, '#F7F5F0'));
  root.style.setProperty('--white', safeHex(profile.surface_color, '#FFFFFF'));
  root.style.setProperty('--font-ui', fontStack(profile.font_family));
  const themeMeta = $('theme-color-meta');
  if (themeMeta) themeMeta.setAttribute('content', safeHex(profile.primary_color, '#0E223D'));
}

function applyProfile(profile) {
  const first = profile.first_names || fallback.first_names || '';
  const last = profile.last_names || fallback.last_names || '';
  const fullName = `${first} ${last}`.trim();
  const role = profile.title || fallback.title || 'Asesor Previsional';
  const photo = profile.photo_path ? storagePublicUrl(profile.photo_path) : (profile.photoUrl || fallback.photoUrl);
  const logo = profile.logo_path ? storagePublicUrl(profile.logo_path) : (profile.logoUrl || fallback.logoUrl);

  document.title = `${fullName} · ${role}`;
  $('advisor-first').textContent = first;
  $('advisor-last').textContent = last;
  $('advisor-role').textContent = role;
  $('advisor-bio').textContent = profile.bio || fallback.bio || '';
  $('advisor-photo').src = photo;
  $('advisor-photo').alt = `Fotografía de ${fullName}`;
  $('brand-logo').src = logo;
  $('footer-logo').src = logo;
  $('footer-name').textContent = fullName;
  $('footer-role').textContent = role;

  const defaultMessage = `Hola ${first.split(' ')[0] || ''}, vi tu tarjeta digital y me gustaría recibir asesoría previsional.`;
  $('whatsapp-primary').href = whatsappUrl(profile, defaultMessage);
  $('whatsapp-closing').href = whatsappUrl(profile, defaultMessage);
  $('floating-whatsapp').href = whatsappUrl(profile, defaultMessage);

  const phoneDigits = toMxE164(profile.phone);
  $('call-link').href = phoneDigits ? `tel:+${phoneDigits}` : '#';
  $('call-link').title = displayPhone(profile.phone);

  const instagram = $('instagram-link');
  if (profile.instagram_url) {
    instagram.href = profile.instagram_url;
    instagram.classList.remove('is-hidden');
  } else {
    instagram.classList.add('is-hidden');
  }

  const facebook = $('facebook-link');
  if (profile.facebook_url) {
    facebook.href = profile.facebook_url;
    facebook.classList.remove('is-hidden');
  } else {
    facebook.classList.add('is-hidden');
  }

  applyTheme(profile);
}

function renderServices(services, profile) {
  const grid = $('service-grid');
  grid.replaceChildren();

  services
    .filter((service) => service.is_visible !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach((service, index) => {
      const article = document.createElement('article');
      article.className = 'service-card';
      article.id = service.service_key;

      const requirements = Array.isArray(service.requirements) ? service.requirements : [];
      const list = requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
      const notice = service.notice ? `<p class="notice">${escapeHtml(service.notice)}</p>` : '';
      const cta = service.cta || 'Quiero recibir información';
      const firstName = (profile.first_names || fallback.first_names || '').split(' ')[0];
      const waMessage = `Hola ${firstName}, vi tu tarjeta digital y me interesa recibir información sobre: ${service.title}.`;

      article.innerHTML = `
        <div class="service-card__number">${String(index + 1).padStart(2, '0')}</div>
        <h3>${escapeHtml(service.title)}</h3>
        <p>${escapeHtml(service.summary || '')}</p>
        <details>
          <summary>Ver información básica</summary>
          <div class="details-content">
            <ul>${list}</ul>
            ${notice}
          </div>
        </details>
        <a class="service-cta" href="${whatsappUrl(profile, waMessage)}" target="_blank" rel="noopener">${escapeHtml(cta)} →</a>
      `;
      grid.appendChild(article);
    });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadRemoteProfile() {
  if (!supabase || !requestedSlug) return null;

  const { data: profile, error } = await supabase
    .from('advisor_profiles')
    .select('*')
    .eq('slug', requestedSlug)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !profile) return null;

  const { data: services } = await supabase
    .from('advisor_services')
    .select('*')
    .eq('advisor_id', profile.id)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  return { profile, services: services || [] };
}

async function init() {
  const fallbackProfile = { ...fallback };
  applyProfile(fallbackProfile);
  renderServices(fallbackServices, fallbackProfile);

  try {
    const remote = await loadRemoteProfile();
    if (!remote) return;
    const merged = { ...fallbackProfile, ...remote.profile };
    applyProfile(merged);
    renderServices(remote.services.length ? remote.services : fallbackServices, merged);
  } catch (error) {
    console.warn('Se usará la configuración local de respaldo.', error);
  }
}

init();
