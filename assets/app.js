import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sbCfg = window.SUPABASE_CONFIG || {};
const fallback = window.ADVISOR_FALLBACK || {};
const fallbackServices = window.ADVISOR_FALLBACK_SERVICES || [];
const $ = (id) => document.getElementById(id);
const whatsappIconData = window.WHATSAPP_ICON_DATA || '';
let profileThemeMode = 'system';

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
    arial: 'Arial, Helvetica, sans-serif',
    tahoma: 'Tahoma, Verdana, Arial, sans-serif',
    verdana: 'Verdana, Geneva, Tahoma, sans-serif',
    trebuchet: '"Trebuchet MS", Helvetica, Arial, sans-serif',
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

function systemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setTheme(theme, persist = false) {
  const effective = theme === 'system' ? systemTheme() : theme;
  document.documentElement.dataset.theme = effective;
  const toggle = $('theme-toggle');
  const icon = $('theme-toggle-icon');
  if (icon) icon.textContent = effective === 'dark' ? '☀' : '☾';
  if (toggle) toggle.setAttribute('aria-label', effective === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  if (persist) localStorage.setItem('cya-theme', effective);
}

function applyTheme(profile) {
  const root = document.documentElement;
  root.style.setProperty('--navy', safeHex(profile.primary_color, '#0E223D'));
  root.style.setProperty('--gold', safeHex(profile.accent_color, '#C9A96E'));
  root.style.setProperty('--paper-light', safeHex(profile.background_color, '#F7F5F0'));
  root.style.setProperty('--surface-light', safeHex(profile.surface_color, '#FFFFFF'));
  root.style.setProperty('--font-ui', fontStack(profile.font_family));
  profileThemeMode = profile.theme_mode || 'system';
  const saved = localStorage.getItem('cya-theme');
  setTheme(saved === 'light' || saved === 'dark' ? saved : profileThemeMode);
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

  document.title = profile.page_title || fallback.page_title || `${fullName} · ${role}`;
  $('advisor-first').textContent = first;
  $('advisor-last').textContent = last;
  $('advisor-role').textContent = role;
  $('ally-label').textContent = profile.ally_label || fallback.ally_label || 'Asesor Aliado';
  $('advisor-bio').textContent = profile.bio || fallback.bio || '';
  $('advisor-photo').src = photo;
  $('advisor-photo').alt = `Fotografía de ${fullName}`;
  $('brand-logo').src = logo;
  $('footer-logo').src = logo;
  $('footer-name').textContent = fullName;
  $('footer-role').textContent = role;

  const trustItems = Array.isArray(profile.trust_items) && profile.trust_items.length
    ? profile.trust_items
    : (Array.isArray(fallback.trust_items) ? fallback.trust_items : ['Atención personalizada', 'Acompañamiento', 'Información clara']);
  ['trust-item-1', 'trust-item-2', 'trust-item-3'].forEach((id, index) => {
    const el = $(id);
    if (el) el.textContent = trustItems[index] || '';
  });
  if ($('closing-kicker')) $('closing-kicker').textContent = profile.closing_kicker || fallback.closing_kicker || 'Orientación inicial';
  if ($('closing-title')) $('closing-title').textContent = profile.closing_title || fallback.closing_title || 'Cuéntame tu caso';
  if ($('closing-text')) $('closing-text').textContent = profile.closing_text || fallback.closing_text || '';
  if ($('whatsapp-closing')) $('whatsapp-closing').textContent = profile.closing_cta || fallback.closing_cta || 'Escribirme por WhatsApp';

  if (whatsappIconData) {
    $('whatsapp-icon').src = whatsappIconData;
    $('floating-whatsapp-icon').src = whatsappIconData;
  }

  const defaultMessage = `Hola ${first.split(' ')[0] || ''}, vi tu tarjeta digital y me gustaría recibir asesoría previsional.`;
  const whatsappDigits = toMxE164(profile.whatsapp || profile.phone);
  const phoneDigits = toMxE164(profile.phone);
  const whatsappTargets = [$('whatsapp-primary'), $('whatsapp-closing'), $('floating-whatsapp')];
  whatsappTargets.forEach((el) => {
    if (!el) return;
    if (whatsappDigits) {
      el.href = whatsappUrl(profile, defaultMessage);
      el.classList.remove('is-hidden');
    } else {
      el.href = '#';
      el.classList.add('is-hidden');
    }
  });
  if (phoneDigits) {
    $('call-link').href = `tel:+${phoneDigits}`;
    $('call-link').title = displayPhone(profile.phone);
    $('call-link').classList.remove('is-hidden');
  } else {
    $('call-link').href = '#';
    $('call-link').classList.add('is-hidden');
  }

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

  const socialButtons = [$('call-link'), instagram, facebook].filter((el) => el && !el.classList.contains('is-hidden'));
  const socialRow = document.querySelector('.social-row');
  if (socialRow) socialRow.style.gridTemplateColumns = `repeat(${Math.max(1, socialButtons.length)}, 1fr)`;

  applyTheme(profile);
}

function renderServices(services, profile) {
  const grid = $('service-grid');
  grid.replaceChildren();

  services
    .filter((service) => service.is_visible !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach((service) => {
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
        <h3>${formatServiceTitle(service.title)}</h3>
        <p>${escapeHtml(service.summary || '')}</p>
        <details>
          <summary>Ver información básica</summary>
          <div class="details-content">
            <ul>${list}</ul>
            ${notice}
          </div>
        </details>
        ${toMxE164(profile.whatsapp || profile.phone) ? `<a class="service-cta" href="${whatsappUrl(profile, waMessage)}" target="_blank" rel="noopener">${escapeHtml(cta)} →</a>` : ''}
      `;
      grid.appendChild(article);
    });
}

function formatServiceTitle(title) {
  const clean = String(title || "");
  if (/Ley 73\s*\/\s*Ley 97/i.test(clean)) {
    return `${escapeHtml(clean.replace(/\s*[·\-]?\s*Ley 73\s*\/\s*Ley 97/i, "").trim())}<br><span class="service-title-nowrap">Ley 73 / Ley 97</span>`;
  }
  return escapeHtml(clean);
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

$('theme-toggle')?.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme || systemTheme();
  setTheme(current === 'dark' ? 'light' : 'dark', true);
});

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (!localStorage.getItem('cya-theme') && profileThemeMode === 'system') setTheme('system');
  });
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
