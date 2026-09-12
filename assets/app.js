(() => {
  const cfg = window.ADVISOR_CONFIG;
  if (!cfg) return;

  const $ = (id) => document.getElementById(id);
  const waUrl = (message) => `https://wa.me/${cfg.whatsappE164}?text=${encodeURIComponent(message)}`;

  document.title = `${cfg.name} · ${cfg.role}`;
  $("advisor-name").textContent = cfg.name;
  $("advisor-photo").src = cfg.photoUrl;
  $("advisor-photo").alt = `Fotografía de ${cfg.name}`;
  $("brand-logo").src = cfg.logoUrl;

  $("whatsapp-primary").href = waUrl(cfg.whatsappDefaultMessage);
  $("whatsapp-closing").href = waUrl(cfg.whatsappDefaultMessage);
  $("floating-whatsapp").href = waUrl(cfg.whatsappDefaultMessage);
  $("call-link").href = `tel:${cfg.phoneE164}`;

  const instagram = $("instagram-link");
  if (cfg.instagramUrl) {
    instagram.href = cfg.instagramUrl;
    instagram.classList.remove("is-hidden");
  }

  const facebook = $("facebook-link");
  if (cfg.facebookUrl) {
    facebook.href = cfg.facebookUrl;
    facebook.classList.remove("is-hidden");
  }

  document.querySelectorAll(".whatsapp-service").forEach((link) => {
    const service = link.dataset.service;
    link.href = waUrl(`Hola Emmanuel, vi tu tarjeta digital y me interesa recibir información sobre: ${service}.`);
  });
})();
