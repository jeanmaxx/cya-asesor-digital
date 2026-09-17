window.SUPABASE_CONFIG = {
  url: "https://lliedfgeegkqeopxvtze.supabase.co",
  publishableKey: "sb_publishable_dvGaagv6ZhJ2GChDinyfBQ_VISGCW62",
  defaultSlug: "demo-publica",
  storageBucket: "advisor-assets"
};

window.ADVISOR_FALLBACK = {
  slug: "demo-publica",
  first_names: "Juan",
  last_names: "Perez Hernandez",
  title: "Asesor Previsional",
  page_title: "Tarjeta Digital Demo - Asesor Previsional",
  company_name: "Casillas & Asociados",
  ally_label: "Asesor Aliado",
  phone: "",
  whatsapp: "",
  whatsapp_message: "Hola Juan, vi tu tarjeta digital y me gustaría recibir asesoría previsional.",
  instagram_url: "https://www.instagram.com/",
  facebook_url: "https://www.facebook.com/",
  bio: "Tarjeta digital demostrativa para presentar servicios de asesoría previsional.",
  photoUrl: "assets/profile-placeholder.svg",
  logoUrl: "assets/logo-placeholder.svg",
  primary_color: "#0E223D",
  accent_color: "#C9A96E",
  background_color: "#F7F5F0",
  surface_color: "#FFFFFF",
  font_family: "helvetica",
  theme_mode: "system",
  trust_items: ["Atención personalizada", "Acompañamiento", "Información clara"],
  closing_kicker: "Orientación inicial",
  closing_title: "Cuéntame tu caso",
  closing_text: "Envíame un mensaje y te indico qué información necesitamos revisar para dar el siguiente paso.",
  closing_cta: "Escribirme por WhatsApp"
};

window.ADVISOR_FALLBACK_SERVICES = [
  { service_key:"retiro-desempleo", title:"Retiro por desempleo", summary:"Revisamos si cumples las condiciones para solicitar un retiro parcial de tu AFORE y te explicamos sus implicaciones.", requirements:["Al menos 46 días naturales en situación de desempleo.","Cuenta AFORE con al menos 3 años de antigüedad y 2 años cotizados al IMSS.","No haber ejercido este retiro en los últimos 5 años.","Expediente de Identificación del Trabajador actualizado."], notice:"Este retiro puede disminuir semanas cotizadas; conviene revisar el impacto antes de solicitarlo.", cta:"Quiero revisar mi caso", sort_order:10, is_visible:true },
  { service_key:"pension-imss", title:"Asesoría en Pensión IMSS · Ley 73 / Ley 97", summary:"Analizamos tu régimen, semanas cotizadas, edad y documentación para identificar la ruta previsional aplicable.", requirements:["CURP, NSS e identificación oficial.","Constancia de semanas cotizadas y, de ser posible, estado de cuenta AFORE.","Ley 73: cotizaciones previas al 1 de julio de 1997 y mínimo 500 semanas, sujeto a vigencia y conservación de derechos.","Ley 97: en 2026 el requisito progresivo es de 875 semanas; 60–64 años para cesantía y 65 para vejez."], notice:"Cada expediente debe revisarse de manera individual; semanas, vigencia y modalidad pueden cambiar el resultado.", cta:"Quiero revisar mi pensión", sort_order:20, is_visible:true },
  { service_key:"ppr", title:"Plan Personal de Retiro", summary:"Diseñamos una ruta de ahorro de largo plazo orientada a complementar tu retiro según tus objetivos y horizonte.", requirements:["Edad, horizonte de retiro y capacidad de aportación.","Objetivo de ahorro y nivel de liquidez que necesitas.","RFC e identificación para evaluar alternativas disponibles.","Las aportaciones a ciertos PPR pueden tener tratamiento fiscal favorable si cumplen los requisitos aplicables."], notice:"Las condiciones, costos y beneficios dependen de la institución y del producto contratado.", cta:"Quiero conocer opciones", sort_order:30, is_visible:true },
  { service_key:"inconsistencias-imss", title:"Resolución de inconsistencias ante el IMSS", summary:"Te orientamos para identificar y encaminar correcciones de datos personales o de afiliación que pueden afectar trámites posteriores.", requirements:["CURP, NSS y correo electrónico personal.","Acta de nacimiento e identificación oficial digitalizadas.","Documento del IMSS que muestre el NSS cuando corresponda.","La documentación exacta depende del tipo de inconsistencia que se necesite regularizar."], notice:"La resolución y documentación final dependen del trámite y de la autoridad competente.", cta:"Quiero revisar mi inconsistencia", sort_order:40, is_visible:true }
];

(() => {
  const current=document.currentScript?.src||'';
  const assetUrl=name=>current?new URL(name,current).href:name;
  const addCss=(name,id)=>{if(document.getElementById(id))return;const l=document.createElement('link');l.id=id;l.rel='stylesheet';l.href=assetUrl(name);document.head.appendChild(l)};
  const addModule=(name,id)=>{if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.type='module';s.src=assetUrl(name);document.head.appendChild(s)};
  const admin=location.pathname.includes('/admin/'),otros=location.pathname.includes('/otros/'),asesores=location.pathname.includes('/asesores/');
  const publicCard=['/asesores/','/negocios/','/esteticas/','/otros/'].some(route=>location.pathname.includes(route));
  if(admin){
    addCss('visual-identity-admin-v4.css?v=20260913-vi6','vi5-admin-css');
    addCss('editor-floating-actions.css?v=20260913-rail3','editor-action-rail-css');
    addCss('advisor-booking-admin-v2.css?v=20260916-booking5','ttd-booking-admin-css');
    addCss('coverage-admin-accordion.css?v=20260916-coverage1','ttd-coverage-accordion-css');
    addModule('visual-identity-admin-v5.js?v=20260913-vi6','vi5-admin-js');
    addModule('editor-floating-actions.js?v=20260913-rail3','editor-action-rail-js');
    addModule('advisor-booking-admin-v2.js?v=20260916-booking5','ttd-booking-admin-js');
    addModule('advisor-booking-layout-fix.js?v=20260916-booking5','ttd-booking-layout-fix-js');
    addModule('coverage-admin-accordion.js?v=20260916-coverage1','ttd-coverage-accordion-js');
  }else if(!otros){
    addCss('visual-identity-public-v4.css?v=20260913-beautyfix1','vi4-public-css');
    addModule('visual-identity-public-v4.js?v=20260913-beautyfix1','vi4-public-js');
  }
  if(!admin&&publicCard){
    addCss('cross-promotion.css?v=20260916-cross1','ttd-cross-promo-css');
    addModule('cross-promotion.js?v=20260916-cross1','ttd-cross-promo-js');
  }
  if(!admin&&asesores){
    addCss('advisor-booking.css?v=20260916-booking4','ttd-advisor-booking-css');
    addModule('advisor-booking-v2.js?v=20260916-booking4','ttd-advisor-booking-js');
  }
})();
