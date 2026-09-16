# TTD · Tu Tarjeta Digital

Plataforma de tarjetas digitales para profesionales y negocios. El repositorio conserva el nombre histórico `cya-asesor-digital`, pero el producto forma parte del ecosistema **ALVA Soluciones Digitales**.

## Arquitectura
- **Cloudflare Pages:** frontend público y panel `/admin/`.
- **Supabase:** Auth, perfiles, configuración visual, servicios, paquetes, analíticas y Storage.
- **RLS:** acceso limitado por usuario, membresía y rol.
- **Lectura pública:** solo perfiles publicados.

## URLs de producción
- Página comercial TTD: `https://ttd-alvasd.pages.dev/otros/?negocio=tu-tarjeta-digital`
- Panel: `https://ttd-alvasd.pages.dev/admin/`
- Tarjetas de asesores: `/?asesor=slug`
- Estéticas/barberías: `/esteticas/?negocio=slug`

## Administración
El panel TTD conserva la operación propia del producto: cuentas, tarjetas, contenido, apariencia, servicios, paquetes, respaldos y verticales.

ALVA Admin funciona como control central comercial y administrativo. Desde ALVA se puede abrir TTD Admin con la misma identidad de Supabase mediante un handoff de sesión seguro; TTD valida nuevamente que el usuario sea administrador principal.

## Paquetes técnicos
- Básico
- Pro
- Premium
- Publicidad cruzada (`cross_promo`)

`cross_promo` conserva las funciones Premium e incorpora la bandera `cross_promotion_cta`. El CTA público de promoción TTD queda pendiente de implementación visual.

## Pendientes visuales
- CTA flotante **¿Quieres una tarjeta digital?** para Publicidad cruzada, con atribución de origen.
- Revisión del favicon para mejorar contraste en pestañas del navegador.
