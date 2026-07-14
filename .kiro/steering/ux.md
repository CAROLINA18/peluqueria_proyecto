# Steering de UX y look & feel

## Dirección visual

La identidad debe sentirse serena, premium y contemporánea, alineada con los logotipos oficiales de Lina Quirama Beauty Salon.

- Base obsidiana/negro cálido para navegación y presencia de marca; marfil cálido para áreas extensas de contenido.
- Acento principal cobre inspirado en el logotipo vertical y acento secundario melocotón inspirado en el sello circular.
- Superficies de trabajo claras, texto carbón y estados funcionales accesibles que armonicen con la marca sin depender del color cobre.
- Tipografía sans legible para interacción; una serif editorial puede usarse solo en títulos de marca.
- Bordes suaves, elevación discreta, espacios generosos y animaciones breves que respeten `prefers-reduced-motion`.
- Iconografía consistente y siempre acompañada por etiqueta o texto accesible en acciones críticas.
- Los tokens de color, espaciado, radio, sombra y tipografía son semánticos; no se dispersan valores hexadecimales.

## Uso de logotipos

- `logos/IMG-20260714-WA0011.jpg` es el logotipo vertical principal: usarlo en login, bienvenida y espacios amplios de marca.
- `logos/IMG-20260714-WA0010.jpg` es el sello circular secundario: usarlo en cabecera móvil, navegación compacta, reportes y cabecera PDF.
- Mantener siempre la proporción mediante `object-fit: contain`; nunca estirar, rotar, recolorear, aplicar filtros o colocar texto encima.
- Mantener el fondo negro propio de los JPG y suficiente espacio libre alrededor; no intentar eliminarlo automáticamente.
- En tamaños donde el texto interno no sea legible, acompañar el sello con el nombre accesible completo.
- El texto alternativo es “Lina Quirama Beauty Salon”; si el nombre ya aparece contiguo, el logo decorativo usa `alt=""` para evitar repetición.
- Los originales no se editan. El build puede crear copias optimizadas WebP/AVIF y tamaños responsive con nombres `logo-vertical` y `logo-seal`.

## Color de texto y contraste

- En superficies marfil/blancas, el texto principal usa carbón casi negro; el secundario usa un gris cálido oscuro y nunca cobre claro.
- En superficies negras/obsidiana, el texto principal usa marfil y el secundario un beige claro con contraste suficiente.
- Cobre y melocotón se reservan para marca, bordes activos, foco, iconos y acentos; solo pueden usarse como texto si la combinación supera WCAG 2.2 AA.
- Enlaces, botones y estados deben distinguirse también por forma, subrayado, icono o etiqueta, no solo por color.
- Error, advertencia, éxito e información usan tokens funcionales armonizados con la paleta, pero conservan significado y contraste independientes.
- Texto normal requiere contraste mínimo 4.5:1 y texto grande 3:1; componentes, bordes de foco e iconos informativos requieren al menos 3:1.
- Disabled debe seguir siendo legible y nunca caer por debajo del contraste acordado para información necesaria.
- Se validan todas las parejas de foreground/background en modos normal, hover, focus, active, selected, disabled y error antes de aprobar el tema.

No se debe imitar literalmente Google Forms. Las capturas son referencia del contenido, no del patrón de interacción.

## Responsive

- Mobile-first desde 360 px; objetivos táctiles mínimos de 44×44 px.
- En móvil: navegación compacta, formulario en una columna, resumen total fijo y acción principal alcanzable con el pulgar.
- En tableta/escritorio: navegación lateral, contenido con ancho cómodo y tablas con filtros persistentes.
- Las tablas se convierten en tarjetas/resúmenes legibles en pantallas estrechas, sin scroll horizontal obligatorio para acciones básicas.

## Registro de venta

El flujo principal es una sola pantalla optimizada:

1. Fecha de negocio, precargada con hoy. El asistente no puede cambiarla.
2. Lista dinámica de servicios realizados con buscador/autocompletado.
3. Cada línea muestra servicio, cantidad, precio sugerido, precio efectivo, subtotal y eliminar.
4. “Añadir otro servicio” agrega una línea sin límite visual fijo.
5. Pagos: uno por defecto con medio seleccionado desde el catálogo activo; “Dividir pago” permite varios y muestra pendiente/restante.
6. Observaciones opcionales.
7. Resumen fijo con total y botón “Registrar venta”.

Comportamientos:

- Al seleccionar un servicio se completa el precio, que puede editarse.
- Una diferencia de precio revela el campo obligatorio “Motivo del cambio”.
- Evitar doble envío; mostrar progreso y conservar los datos si hay un error recuperable.
- Tras éxito, mostrar confirmación con total, folio y acciones “Registrar otra” / “Ver detalle”.
- Advertir antes de salir con cambios sin guardar.
- Validar en línea después de interacción y resumir errores al enviar, llevando el foco al primero.

## Pantallas

- **Login**: composición sobria sobre negro cálido con el logotipo vertical principal, correo, contraseña, mostrar/ocultar y recuperación futura marcada fuera de alcance.
- **Preferencias**: selector ES/EN accesible desde la cabecera o perfil; el cambio se aplica sin recargar ni perder datos sin guardar.
- **Dashboard**: saludo, ventas propias de hoy y accesos según perfil; administradores/senior ven indicadores autorizados.
- **Ventas**: lista filtrable con total, autor, fecha, estado y detalle; acciones visibles según rol.
- **Catálogos**: centro administrativo con pestañas para servicios, categorías de servicio y medios de pago; incluye búsqueda, alta/edición, orden, estado y confirmación de desactivación.
- **Usuarios**: alta/edición, rol, estado, reinicio de contraseña temporal y prevención del último admin.
- **Reportes**: selector rápido y rango visible, tarjetas KPI, desglose y tabla; el administrador dispone de Día/Semana/Mes/Año/Rango y el senior solo de Día/Mes, ambos con exportación PDF/XLSX dentro de su alcance.
- **Auditoría**: solo administrador, filtros por actor, acción, entidad y fecha.

## Estados y contenido

Toda vista asíncrona define:

- skeleton de carga sin saltos de layout;
- estado vacío con una siguiente acción útil;
- error recuperable con reintento;
- sin permisos con explicación no sensible;
- desconexión/sesión expirada con retorno seguro al login.

Los mensajes usan lenguaje claro y específico en el idioma elegido. Ejemplo en español: “Los pagos suman 5,00 € menos que el total” en vez de “Datos inválidos”. No usar confirmaciones genéricas para acciones destructivas: indicar registro y consecuencia.

Todos los textos visibles y accesibles deben existir en español e inglés: navegación, labels, ayudas, validaciones, estados, diálogos, notificaciones, tablas, gráficos, PDF y XLSX. Nombres creados por el negocio —como servicios o medios de pago— se muestran tal como fueron registrados y no se traducen automáticamente.

## Accesibilidad

- Objetivo WCAG 2.2 AA.
- HTML semántico, labels persistentes, orden de foco lógico y navegación completa por teclado.
- No comunicar estado solo por color.
- Contraste AA en todos los estados, incluidos disabled, focus y error.
- Diálogos con foco atrapado y restaurado al cerrar.
- Gráficos con tabla o resumen textual equivalente.
- Importes y fechas localizados, conservando valores accesibles inequívocos.
