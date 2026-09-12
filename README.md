# CyA Asesor Digital

Tarjeta digital / landing móvil para asesores de Casillas & Asociados.

## Arquitectura

- **GitHub Pages:** frontend público y panel `/admin/`.
- **Supabase:** Auth, perfiles, configuración visual, servicios y Storage.
- **RLS:** cada asesor autenticado solo puede editar su propio perfil y archivos.
- **Lectura pública:** solo perfiles marcados como publicados.

## URLs

- Landing: `https://jeanmaxx.github.io/cya-asesor-digital/`
- Panel: `https://jeanmaxx.github.io/cya-asesor-digital/admin/`
- Perfiles: `?asesor=slug-del-asesor`

## Personalización desde /admin

- Nombre y apellidos
- Cargo y empresa
- Teléfono y WhatsApp
- Instagram y Facebook
- Fotografía y logo
- Colores
- Tipografía
- Estado de publicación

La landing conserva un perfil local de respaldo para José Emmanuel Álvarez Nieto mientras se crea y publica el primer usuario en Supabase.
