import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sbCfg = window.SUPABASE_CONFIG || {};
const fallback = window.ADVISOR_FALLBACK || {};
const fallbackServices = window.ADVISOR_FALLBACK_SERVICES || [];
const $ = (id) => document.getElementById(id);
const whatsappIconData = window.WHATSAPP_ICON_DATA || '';
let profileThemeMode = 'system';

const searchParams = new URLSearchParams(window.location.search);
const hasExplicitSlug = searchParams.has('asesor');
const requestedSlug = searchParams.get('asesor') || sbCfg.defaultSlug || fallback.slug;
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

function whatsappBaseMessage(profile) {
  const custom = String(profile.whatsapp_message || '').trim();
  if (custom) return custom;
  const first = String(profile.first_names || '').split(' ')[0];
  return `Hola ${first || ''}, vi tu tarjeta digital y me gustaría recibir asesoría previsional.`;
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

function renderUnavailable(kind = 'inactive') {
  const isDraft = kind === 'draft';
  document.title = isDraft ? 'Tarjeta no disponible' : 'Tarjeta temporalmente no disponible';
  document.body.classList.remove('profile-loading');
  document.body.innerHTML = `
    <main style="min-height:100svh;display:grid;place-items:center;padding:28px;background:radial-gradient(circle at 18% 12%,rgba(201,169,110,.13),transparent 30%),linear-gradient(155deg,#09182b 0%,#0e223d 55%,#132d4a 100%);font-family:\"Helvetica Neue\",Helvetica,Arial,sans-serif;color:#fff;text-align:center">
      <section style="width:min(100%,520px);padding:42px 30px;border:1px solid rgba(255,255,255,.12);border-radius:28px;background:rgba(255,255,255,.055);box-shadow:0 26px 80px rgba(0,0,0,.24);backdrop-filter:blur(8px)">
        <div style="width:72px;height:72px;margin:0 auto 24px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(201,169,110,.75);box-shadow:0 0 0 5px rgba(201,169,110,.08);color:#ead8ae;font-size:1.7rem">◇</div>
        <p style="margin:0 0 9px;color:#c9a96e;font-size:.72rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Tarjeta digital</p>
        <h1 style="margin:0;font-size:clamp(1.9rem,7vw,2.65rem);line-height:1.08;letter-spacing:-.035em">${isDraft ? 'Tarjeta no disponible' : 'Tarjeta temporalmente no disponible'}</h1>
        <p style="margin:18px auto 0;max-width:400px;color:rgba(255,255,255,.72);line-height:1.65">${isDraft ? 'Esta tarjeta todavía no se encuentra publicada.' : 'Esta tarjeta digital se encuentra actualmente inactiva. Intenta nuevamente más adelante.'}</p>
      </section>
    </main>`;
}

function applyProfile(profile) {
  const first = profile.first_names || '';
  const last = profile.last_names || '';
  const fullName = `${first} ${last}`.trim();
  const role = profile.title || 'Asesor Previsional';
  const photo = profile.photo_path ? storagePublicUrl(profile.photo_path) : (profile.photoUrl || fallback.photoUrl || 'assets/profile-placeholder.svg');
  const logo = profile.logo_path ? storagePublicUrl(profile.logo_path) : (profile.logoUrl || fallback.logoUrl || 'assets/logo-placeholder.svg');

  document.title = profile.page_title || (fullName ? `${fullName} · ${role}` : 'Tarjeta Digital · Asesor Previsional');
  $('advisor-first').textContent = first;
  $('advisor-last').textContent = last;
  $('advisor-role').textContent = role;
  $('ally-label').textContent = profile.ally_label || 'Asesor Aliado';
  $('advisor-bio').textContent = profile.bio || '';
  $('advisor-photo').src = photo;
  $('advisor-photo').alt = fullName ? `Fotografía de ${fullName}` : 'Fotografía de perfil';
  $('brand-logo').src = logo;
  $('footer-logo').src = logo;
  $('footer-name').textContent = fullName;
  $('footer-role').textContent = role;

  const trustItems = Array.isArray(profile.trust_items) && profile.trust_items.length
    ? profile.trust_items
    : ['Atención personalizada', 'Acompañamiento', 'Información clara'];
  ['trust-item-1', 'trust-item-2', 'trust-item-3'].forEach((id, index) => {
    const el = $(id);
    if (el) el.textContent = trustItems[index] || '';
  });
  if ($('closing-kicker')) $('closing-kicker').textContent = profile.closing_kicker || 'Orientación inicial';
  if ($('closing-title')) $('closing-title').textContent = profile.closing_title || 'Cuéntame tu caso';
  if ($('closing-text')) $('closing-text').textContent = profile.closing_text || '';
  if ($('whatsapp-closing')) $('whatsapp-closing').textContent = profile.closing_cta || 'Escribirme por WhatsApp';

  if (whatsappIconData) {
    $('whatsapp-icon').src = whatsappIconData;
    $('floating-whatsapp-icon').src = whatsappIconData;
  }

  const defaultMessage = whatsappBaseMessage(profile);
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
      const waMessage = `${whatsappBaseMessage(profile)}\n\nMe interesa recibir información sobre: ${service.title}.`;

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
  const clean = String(title || '');
  if (/Ley 73\s*\/\s*Ley 97/i.test(clean)) {
    return `${escapeHtml(clean.replace(/\s*[·\-]?\s*Ley 73\s*\/\s*Ley 97/i, '').trim())}<br><span class="service-title-nowrap">Ley 73 / Ley 97</span>`;
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

  let accountStatus = 'active';
  try {
    const { data: context } = await supabase.rpc('get_public_card_features', {
      p_account_type: 'advisor',
      p_slug: requestedSlug
    });
    if (context?.status) accountStatus = context.status;
  } catch {}

  if (accountStatus === 'suspended' || accountStatus === 'cancelled') {
    return { profile, services: [], status: accountStatus };
  }

  const { data: services, error: servicesError } = await supabase
    .from('advisor_services')
    .select('*')
    .eq('advisor_id', profile.id)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (servicesError) console.warn('No fue posible cargar los servicios del perfil.', servicesError);
  return { profile, services: services || [], status: accountStatus };
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

function revealProfile() {
  document.body.classList.remove('profile-loading');
}

async function init() {
  const fallbackProfile = { ...fallback };

  try {
    const remote = await loadRemoteProfile();
    if (remote) {
      if (remote.status === 'suspended' || remote.status === 'cancelled') {
        renderUnavailable('inactive');
        return;
      }
      applyProfile(remote.profile);
      renderServices(remote.services, remote.profile);
      return;
    }

    if (hasExplicitSlug) {
      renderUnavailable('draft');
      return;
    }

    applyProfile(fallbackProfile);
    renderServices(fallbackServices, fallbackProfile);
  } catch (error) {
    console.warn('Se usará la configuración local de respaldo.', error);
    if (hasExplicitSlug) {
      renderUnavailable('draft');
      return;
    }
    applyProfile(fallbackProfile);
    renderServices(fallbackServices, fallbackProfile);
  } finally {
    revealProfile();
  }
}

init();
