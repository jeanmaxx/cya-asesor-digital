# TTD · Tu Tarjeta Digital

Plataforma de tarjetas digitales para personas y negocios. El repositorio conserva el nombre histórico `cya-asesor-digital`, pero el producto forma parte del ecosistema **ALVA Soluciones Digitales**.

## Arquitectura
- **Cloudflare Pages:** frontend público y administración TTD.
- **Supabase:** Auth, perfiles, configuración visual, servicios, paquetes, agenda, analíticas y Storage.
- **RLS:** acceso limitado por usuario, membresía y rol.
- **Lectura pública:** solo perfiles publicados y funciones expresamente públicas.

## URLs canónicas
- Página comercial TTD: `https://ttd-alvasd.pages.dev/`
- Demo: `https://ttd-alvasd.pages.dev/demo/`
- Panel principal: `https://ttd-alvasd.pages.dev/admin/`
- Tarjetas Digitales Personales: `/admin/personales/`
- Administración personal: `/admin/personales/<slug>`
- Barberías: `/admin/barberias/`
- Administración de barbería: `/admin/barberias/<slug>`
- Otros Negocios: `/admin/otros/`
- Administración de otro negocio: `/admin/otros/<slug>`

Las rutas heredadas permanecen compatibles durante la migración para no romper enlaces existentes.

## Superficies públicas actuales
- Tarjetas personales: `/asesores/?asesor=<slug>` — ruta pública heredada que se conserva por compatibilidad.
- Barberías: `/barberias/?negocio=<slug>`.
- Otros negocios: `/otros/?negocio=<slug>`.

## Administración
`/admin/` es el punto central de entrada del producto. Desde ahí se accede a:

1. **Tarjetas Digitales Personales** — personas, profesionistas y asesores.
2. **Barberías** — vertical especializado con catálogo, sucursal y agenda.
3. **Otros Negocios** — vertical flexible, ubicado al final de la navegación.

La fórmula de marca administrativa es:

> **PANEL DE ADMINISTRACIÓN DE**  
> **TU TARJETA DIGITAL**  
> *Una solución de ALVA Soluciones Digitales.*

La administración utiliza el estándar visual ALVA (Manrope, navegación, cards, modo claro/oscuro y componentes coherentes), con azul marino/cian como acento TTD. Las páginas públicas conservan la identidad propia de cada cliente.

## Relación con ALVA Admin
ALVA Admin funciona como control central comercial y administrativo. TTD Admin conserva la operación interna del producto: cuentas, tarjetas, servicios, apariencia, agendas, ubicaciones, usuarios y funciones específicas.

Principio:

> **ALVA Admin sabe qué tiene contratado cada cliente; cada producto sabe cómo ejecutar su propia función.**

## Modelo comercial
Los planes funcionales y las condiciones comerciales se mantienen separados.

Planes TTD:
- Básico
- Pro
- Premium

Condiciones comerciales administradas desde ALVA incluyen, entre otras:
- Normal
- Prueba
- Publicidad cruzada
- Cortesía
- Convenio
- Descuento especial

La condición **Publicidad cruzada** puede habilitar `cross_promotion_cta` sin convertirse en un plan funcional independiente.

## Agenda TTD
TTD cuenta con motor de agenda persistente para tarjetas personales y negocios compatibles:
- disponibilidad y horarios,
- selección de servicio,
- solicitudes persistentes,
- prevención de doble reserva,
- confirmación/rechazo mediante enlace seguro por token,
- WhatsApp,
- Google Calendar,
- formato de fecha mexicano `dd/mm/aaaa`.

## Estándar técnico
Consulta `docs/TTD_ADMIN_STANDARD.md` para el estándar administrativo propio y el documento `PRODUCT_STANDARD.md` del repositorio ALVA para la regla multiproducto general.
