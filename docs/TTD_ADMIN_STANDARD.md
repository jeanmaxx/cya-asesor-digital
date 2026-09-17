# Estándar de administración TTD

## Objetivo
TTD adopta un patrón administrativo común con ALVA Soluciones Digitales para que cada producto del ecosistema comparta lenguaje visual, organización, navegación y seguridad sin perder sus funciones propias.

## Regla de marca

**PANEL DE ADMINISTRACIÓN DE**
**TU TARJETA DIGITAL**

*Una solución de ALVA Soluciones Digitales.*

La administración usa la identidad TTD + ALVA. Las tarjetas públicas conservan la identidad visual propia de cada persona o negocio.

## Arquitectura administrativa

- `/admin/` — Home central TTD.
- `/admin/personales/` — Tarjetas Digitales Personales.
- `/admin/personales/<slug>` — Administración individual de una tarjeta personal.
- `/admin/barberias/` — Barberías.
- `/admin/barberias/<slug>` — Administración individual de una barbería.
- `/admin/otros/` — Otros negocios, colocado al final de la navegación.

Las rutas heredadas permanecen compatibles mediante redirecciones durante la migración.

## Nomenclatura

- `Tarjetas Digitales Asesores` pasa a `Tarjetas Digitales Personales`.
- `Estéticas y Barberías` pasa a `Barberías`.
- `Otros Negocios` permanece como vertical flexible y se coloca al final.

## Estándar visual ALVA

Los paneles administrativos de TTD deben compartir con ALVA Admin:

- Manrope como tipografía principal.
- Navegación lateral o equivalente responsive.
- Header superior compacto.
- Cards, tablas, badges, inputs, modales y estados coherentes.
- Tema claro/oscuro.
- Espaciado, bordes y jerarquía visual comunes.
- Componentes responsive reutilizables.

TTD conserva azul marino/cian como acento de producto; ALVA conserva grafito/ámbar.

## Patrón para futuros productos ALVA

Todo producto nuevo debe seguir, salvo necesidad funcional justificada:

`Landing → Demo → Admin del producto → Aplicación/experiencia → ALVA Admin`

Principio de arquitectura:

> ALVA Admin sabe qué tiene contratado cada cliente; cada producto sabe cómo ejecutar su propia función.

## Compatibilidad

Durante la migración no se deben romper enlaces, QR ni accesos actuales. Las rutas antiguas deben redirigir a las nuevas rutas canónicas cuando sea posible y permanecer disponibles hasta validar producción.
