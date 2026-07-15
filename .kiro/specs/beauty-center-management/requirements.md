# Especificación de requisitos

## 1. Alcance y supuestos

Esta especificación cubre el MVP de administración de caja de un único centro de estética bajo los steering de `.kiro/steering/`.

Decisiones de negocio confirmadas:

- La única moneda del MVP es EUR.
- La zona horaria IANA del negocio es `Europe/Brussels` (Bélgica) y gobierna la fecha de negocio y los límites de los reportes.
- El nombre corporativo oficial para la aplicación, reportes, PDF y XLSX es `Lina Quirama Beauty Salon`.
- Los archivos `logos/IMG-20260714-WA0010.jpg` y `logos/IMG-20260714-WA0011.jpg` son los logotipos oficiales.
- El asistente senior registra ventas de servicios tomados y solo consulta/exporta reportes de día o mes.
- Los servicios, las categorías de servicio y los medios de pago son catálogos administrables exclusivamente por el administrador.
- La interfaz admite español (`es`) e inglés (`en`), con español como idioma predeterminado.

Prioridades MoSCoW:

- **Must**: necesario para la primera versión desplegable.
- **Should**: importante, puede entrar inmediatamente después sin cambiar arquitectura.
- **Could**: mejora no bloqueante.

Las palabras **DEBE**, **NO DEBE**, **DEBERÍA** y **PUEDE** son normativas.

## 2. Requisitos funcionales

### REQ-AUTH-001 — Autenticación y sesión (Must)

**Historia:** Como usuario activo, quiero autenticarme de forma segura para usar únicamente las capacidades de mi perfil.

**Criterios de aceptación:**

1. CUANDO un usuario activo envía correo y contraseña válidos, EL SISTEMA DEBE iniciar una sesión, devolver su perfil y dirigirlo a su pantalla autorizada.
2. SI las credenciales son inválidas o la cuenta está inactiva, EL SISTEMA DEBE responder con el mismo mensaje genérico y no revelar cuál condición falló.
3. CUANDO expira el access token y el refresh token sigue vigente, EL SISTEMA DEBE rotar la sesión sin perder trabajo del formulario.
4. CUANDO un usuario cierra sesión, EL SISTEMA DEBE revocar el refresh token y limpiar la sesión local.
5. SI una cuenta es desactivada o cambia su rol, EL SISTEMA DEBE invalidar sus sesiones activas.
6. EL SISTEMA DEBE limitar intentos de autenticación y auditar éxitos y fallos.

### REQ-USER-001 — Administración de usuarios (Must)

**Historia:** Como administrador, quiero mantener usuarios y roles para controlar quién opera el sistema.

**Criterios de aceptación:**

1. EL ADMINISTRADOR DEBE poder listar, buscar, crear y editar toda la información administrable de un usuario: nombre, identificador de acceso, correo cuando aplique, rol `ADMIN`, `SENIOR_ASSISTANT` o `ASSISTANT` y estado.
2. AL crear un usuario, EL SISTEMA DEBE exigir contraseña temporal robusta o generarla y forzar cambio en el primer acceso.
3. EL SISTEMA DEBE rechazar correos duplicados sin distinguir mayúsculas/minúsculas.
4. EL ADMINISTRADOR DEBE poder activar o desactivar una cuenta sin borrarla físicamente.
5. EL SISTEMA NO DEBE permitir desactivar o degradar al último administrador activo.
6. UN USUARIO NO ADMINISTRADOR NO DEBE leer listados de usuarios ni mutar cuentas.
7. TODA mutación DEBE guardar auditoría de actor y cambios.

### REQ-SVC-001 — Catálogo de servicios (Must)

**Historia:** Como administrador, quiero mantener servicios y precios sugeridos para que el registro diario sea consistente.

**Criterios de aceptación:**

1. EL ADMINISTRADOR DEBE poder listar, buscar, crear y editar toda la información administrable de un servicio: nombre, categoría opcional, descripción opcional, precio sugerido y estado.
2. EL nombre activo DEBE ser único normalizando espacios y mayúsculas/minúsculas.
3. EL precio sugerido DEBE ser mayor que cero, usar la moneda configurada y aceptar como máximo los decimales admitidos por ella.
4. UN servicio referenciado DEBE desactivarse, no eliminarse físicamente.
5. UN servicio inactivo NO DEBE aparecer en el selector de ventas nuevas y DEBE conservarse en históricos.
6. SOLO el administrador DEBE mutar el catálogo; los demás perfiles solo pueden consultar servicios activos para registrar los servicios tomados en una venta.
7. TODA mutación DEBE quedar auditada.

### REQ-CAT-001 — Categorías y medios de pago administrables (Must)

**Historia:** Como administrador, quiero crear y mantener los catálogos usados por las listas desplegables para adaptar la operación del centro sin modificar código.

**Criterios de aceptación:**

1. EL ADMINISTRADOR DEBE poder listar, buscar, crear, editar, ordenar, activar y desactivar categorías de servicio y medios de pago.
2. CADA categoría DEBE tener nombre único normalizado, descripción opcional, orden y estado.
3. CADA medio de pago DEBE tener código interno único, nombre visible único, descripción opcional, orden y estado.
4. LAS listas desplegables de ventas y servicios DEBEN mostrar únicamente opciones activas, ordenadas según el catálogo.
5. UN elemento referenciado NO DEBE eliminarse físicamente; al desactivarlo DEBE conservarse en ventas y servicios históricos mediante sus referencias y snapshots.
6. EL SISTEMA NO DEBE permitir desactivar el último medio de pago activo.
7. SOLO el administrador DEBE consultar la vista administrativa o mutar estos catálogos; senior y asistente solo reciben opciones activas necesarias para registrar ventas.
8. ROLES, estados de venta y estados de usuario NO DEBEN ser catálogos editables porque forman parte de las reglas de seguridad e integridad.
9. TODA mutación DEBE quedar auditada.
10. LOS formularios de alta y edición DEBEN exponer todos los campos administrables del tipo de catálogo, incluidos descripción y orden para categorías y medios de pago, código para medios de pago y categoría, descripción y precio para servicios.

### REQ-SALE-001 — Crear venta (Must)

**Historia:** Como operador autorizado, quiero registrar en una sola operación los servicios realizados y cobros para mantener la caja al día.

**Criterios de aceptación:**

1. UNA venta DEBE contener fecha de negocio, al menos una línea, al menos un pago y observaciones opcionales.
2. CADA línea DEBE seleccionar un servicio activo, cantidad entera positiva, precio sugerido capturado y precio efectivo positivo.
3. AL seleccionar un servicio, EL SISTEMA DEBE precargar su precio vigente y permitir que el operador lo edite antes de guardar; SI lo cambia, DEBE mostrar y exigir una nota obligatoria que explique por qué modificó el precio precargado.
4. SI el precio efectivo difiere del sugerido, EL SISTEMA NO DEBE guardar la venta sin la nota de cambio y DEBE auditar el precio precargado, el precio efectivo, la nota y el usuario que realizó el cambio.
5. EL SISTEMA DEBE permitir agregar/eliminar dinámicamente hasta 50 líneas, sin bloques fijos vacíos.
6. EL SISTEMA DEBE admitir uno o varios pagos y, en cada pago, DEBE permitir registrar desde una lista desplegable un medio de pago activo y un importe positivo.
7. LA suma de los pagos DEBE coincidir exactamente con el total calculado por el servidor y la interfaz DEBE mostrar el importe pendiente o excedente antes de guardar.
8. LOS medios iniciales del seed DEBEN ser Tarjeta, Efectivo, Bono regalo, Treatwell, Bono pagado y Otros, pero el administrador DEBE poder mantenerlos desde el catálogo.
9. AL guardar, EL SISTEMA DEBE capturar el id, código y nombre visible del medio de pago para que cambios posteriores no alteren el histórico.
10. EL SISTEMA DEBE rechazar servicios o medios de pago inactivos, importes no positivos, más de dos decimales en EUR, totales enviados manipulados y ventas vacías.
11. AL guardar con éxito, EL SISTEMA DEBE asignar folio único, autor e instante UTC, y devolver el total calculado y los medios de pago registrados.
12. LA creación DEBE ser transaccional e idempotente ante reintento con la misma clave.

### REQ-SALE-002 — Restricción del asistente (Must)

**Historia:** Como asistente, quiero registrar el trabajo del día y ver mis propios registros sin acceder a información ajena.

**Criterios de aceptación:**

1. PARA el rol `ASSISTANT`, EL SISTEMA DEBE fijar la fecha de negocio al día actual de `APP_TIMEZONE` y rechazar otra fecha aunque se manipule la API.
2. EL ASISTENTE DEBE poder listar y abrir únicamente ventas cuyo `createdBy` sea su id.
3. EL ASISTENTE NO DEBE editar, anular, exportar ni obtener agregaciones globales.
4. SI intenta acceder a un id ajeno, EL SISTEMA DEBE responder como recurso no encontrado para evitar enumeración.

### REQ-SALE-003 — Operación del asistente senior (Must)

**Historia:** Como asistente senior, quiero registrar los servicios que se hayan tomado y consultar reportes diarios o mensuales para apoyar el control operativo.

**Criterios de aceptación:**

1. EL SENIOR DEBE registrar ventas con uno o varios servicios tomados, sus precios efectivos y sus medios de pago, aplicando las mismas validaciones financieras.
2. EL SENIOR DEBE consultar y descargar en PDF o XLSX reportes globales únicamente para un día o un mes seleccionado.
3. SI el senior solicita semana, año o rango personalizado manipulando la API, EL SISTEMA DEBE rechazarlo con `403`.
4. EL SENIOR NO DEBE administrar usuarios o catálogos ni editar/anular ventas.

### REQ-SALE-004 — Administración de ventas (Must)

**Historia:** Como administrador, quiero consultar, corregir o anular cualquier venta conservando trazabilidad.

**Criterios de aceptación:**

1. EL ADMINISTRADOR DEBE listar ventas paginadas y filtrar por rango, autor, servicio, medio de pago, estado y folio.
2. EL ADMINISTRADOR DEBE abrir cualquier detalle con líneas, pagos, totales, autor y auditoría relevante.
3. EL ADMINISTRADOR DEBE editar fecha, líneas, pagos y observaciones usando las mismas reglas de creación.
4. CADA edición DEBE exigir motivo, guardar antes/después y detectar conflictos concurrentes con `409`.
5. EL ADMINISTRADOR DEBE anular, no borrar físicamente, una venta indicando motivo obligatorio.
6. UNA venta anulada DEBE permanecer consultable, marcarse visiblemente y excluirse de reportes por defecto.
7. EL SISTEMA DEBE permitir incluir anuladas mediante filtro explícito solo al administrador.

### REQ-REPORT-001 — Reportes de ventas (Must)

**Historia:** Como usuario autorizado, quiero analizar ventas dentro de los periodos permitidos para mi perfil para tomar decisiones y cerrar caja.

**Criterios de aceptación:**

1. EL ADMINISTRADOR DEBE elegir día, semana ISO, mes, año o rango personalizado; EL SENIOR DEBE elegir únicamente día o mes.
2. EL reporte DEBE mostrar rango efectivo, moneda, número de ventas, unidades de servicio, ingresos totales, ticket promedio y anulaciones separadas.
3. EL reporte DEBE desglosar como mínimo por día del periodo, servicio, autor y medio de pago.
4. SOLO ventas no anuladas cuya fecha de negocio esté dentro del rango inclusivo DEBEN sumar KPIs por defecto.
5. LOS totales de pagos por medio DEBEN coincidir con ingresos totales; los totales por líneas DEBEN coincidir con el mismo total.
6. SI no hay datos, EL SISTEMA DEBE mostrar ceros y un estado vacío útil, no un error.
7. EL backend DEBE autorizar y calcular el reporte; el frontend no debe agregar datos descargados sin control.
8. RANGOS inválidos o excesivos DEBEN responder con validación clara; el máximo inicial es cinco años.
9. EL backend DEBE rechazar cualquier periodo que exceda el alcance del rol, aunque la opción esté oculta en el frontend.

### REQ-EXPORT-001 — Exportar PDF y Excel (Must)

**Historia:** Como administrador o senior, quiero exportar el reporte visible para compartirlo o archivarlo.

**Criterios de aceptación:**

1. EL SISTEMA DEBE exportar exactamente el rango y filtros activos a PDF y XLSX.
2. EL PDF DEBE mostrar el sello oficial `IMG-20260714-WA0010.jpg` y `Lina Quirama Beauty Salon` como identidad corporativa en su cabecera e incluir periodo, generación, usuario generador, KPIs, desgloses, moneda y numeración de páginas.
3. EL XLSX DEBE incluir cuatro hojas localizadas —`Resumen`, `Ventas`, `Servicios`, `Pagos` en español o `Summary`, `Sales`, `Services`, `Payments` en inglés—, encabezados congelados, filtros y tipos numéricos/fecha correctos.
4. LA hoja de resumen DEBE incluir KPIs y desgloses por día, usuario, servicio y medio de pago; LA hoja de ventas DEBE identificar cada venta, su usuario, total, servicios y pagos; LA hoja de servicios DEBE detallar por línea la cantidad, precio sugerido, precio efectivo, diferencia, subtotal, motivo de cambio, usuario y medios de pago de la venta; LA hoja de pagos DEBE detallar cada pago con venta, usuario, código, medio, referencia, importe, total de venta y servicios asociados.
5. EL libro XLSX DEBE identificar a `Lina Quirama Beauty Salon` en la hoja de resumen y en sus propiedades de documento.
6. LOS archivos DEBEN usar nombre seguro `reporte-ventas-AAAA-MM-DD_aaaa-mm-dd.ext` y descargarse con MIME correcto.
7. EL XLSX DEBE neutralizar formula injection en valores de texto controlables por usuarios.
8. UNA exportación DEBE respetar permisos, tener rate limit y quedar auditada con filtros, no con el contenido completo.
9. SI la generación falla, EL SISTEMA DEBE mostrar error recuperable y no entregar un archivo parcial.
10. EL SENIOR DEBE descargar únicamente reportes diarios o mensuales; EL ADMINISTRADOR DEBE descargar todos los periodos autorizados.

### REQ-AUDIT-001 — Consulta de auditoría (Should)

**Historia:** Como administrador, quiero consultar eventos sensibles para investigar correcciones y accesos.

**Criterios de aceptación:**

1. SOLO el administrador DEBE listar auditoría paginada y filtrarla por fecha, actor, acción y entidad.
2. LOS eventos DEBEN ser inmutables desde las rutas de aplicación.
3. LOS valores sensibles DEBEN estar redactados.

### REQ-DASH-001 — Inicio por perfil (Should)

**Historia:** Como usuario, quiero un inicio relevante para comenzar rápido mi trabajo.

**Criterios de aceptación:**

1. EL ASISTENTE DEBE ver acceso principal a “Nueva venta” y resumen de sus ventas de hoy.
2. EL SENIOR DEBE ver accesos a nueva venta y reportes diarios/mensuales.
3. EL ADMINISTRADOR DEBE ver KPIs de hoy y accesos a ventas, reportes, catálogos y usuarios.
4. NINGÚN perfil DEBE ver accesos que no pueda ejecutar.

### REQ-I18N-001 — Preferencia de idioma español/inglés (Must)

**Historia:** Como usuario, quiero elegir español o inglés para comprender y utilizar toda la aplicación en mi idioma preferido.

**Criterios de aceptación:**

1. TODO usuario autenticado DEBE poder seleccionar `Español` o `English` desde una opción accesible y visible de preferencias.
2. EL SISTEMA DEBE usar español en el primer acceso, salvo que el usuario ya tenga una preferencia guardada.
3. AL cambiar el idioma, LA interfaz DEBE actualizarse sin cerrar sesión, recargar toda la aplicación ni perder datos no guardados.
4. EL SISTEMA DEBE persistir la preferencia en la cuenta y restaurarla en dispositivos y sesiones posteriores.
5. NAVEGACIÓN, formularios, labels, ayudas, validaciones, errores, confirmaciones, estados, tablas, KPIs, gráficos y contenido accesible DEBEN estar traducidos al español y al inglés.
6. FECHAS, números e importes EUR DEBEN formatearse según el locale elegido, sin modificar los valores almacenados.
7. PDF y XLSX DEBEN generarse en el idioma preferido del usuario que solicita la exportación, incluyendo títulos, encabezados, periodos y nombres de hojas.
8. NOMBRES administrables introducidos por el negocio —usuarios, servicios, categorías y medios de pago— NO DEBEN traducirse automáticamente.
9. SI falta una traducción, EL SISTEMA DEBE usar español como fallback, registrar una advertencia técnica sin datos sensibles y nunca mostrar la clave interna al usuario.
10. CI DEBE comprobar que los catálogos `es` y `en` tienen las mismas claves y que no existen textos de interfaz críticos sin internacionalizar.
11. LA pantalla de login DEBE ofrecer el mismo selector ES/EN y conservar localmente esa elección no sensible hasta que se autentique y se aplique la preferencia guardada de la cuenta.

### REQ-BRAND-001 — Identidad visual y logotipos oficiales (Must)

**Historia:** Como propietario del centro, quiero que la aplicación y sus documentos utilicen los logotipos de Lina Quirama Beauty Salon para ofrecer una experiencia coherente y reconocible.

**Criterios de aceptación:**

1. LA aplicación DEBE usar `IMG-20260714-WA0011.jpg` como logotipo vertical principal en login y espacios amplios de marca.
2. LA aplicación DEBE usar `IMG-20260714-WA0010.jpg` como sello secundario en navegación compacta, móvil, reportes y PDF.
3. LOS logotipos DEBEN conservar proporción, fondo, colores y espacio de seguridad; NO DEBEN estirarse, rotarse, recolorearse, filtrarse ni recibir texto superpuesto.
4. EL look & feel DEBE derivar de la marca usando tokens semánticos de obsidiana/negro cálido, cobre, melocotón, marfil y carbón.
5. EN superficies claras, EL texto principal DEBE usar carbón casi negro; EN superficies oscuras, DEBE usar marfil. Cobre y melocotón NO DEBEN usarse como texto si no alcanzan contraste WCAG 2.2 AA.
6. TODO texto normal DEBE alcanzar al menos 4.5:1, texto grande 3:1 y controles/foco/iconos informativos 3:1, incluyendo hover, focus, active, selected, disabled y error.
7. LOS originales dentro de `logos/` NO DEBEN modificarse; cualquier optimización DEBE generar copias reproducibles en el directorio de assets de Angular.
8. CADA uso informativo DEBE tener nombre accesible “Lina Quirama Beauty Salon”; cuando el mismo texto sea adyacente, el logo DEBE tratarse como decorativo para evitar lectura duplicada.
9. EL logo DEBE verse nítido, sin recortes y sin provocar saltos de layout en móvil, tableta, escritorio y PDF.
10. SI un activo optimizado no carga, LA interfaz DEBE conservar el nombre corporativo visible y no mostrar una imagen rota.

## 3. Requisitos no funcionales

### REQ-NFR-001 — UX, responsive y accesibilidad (Must)

1. LAS rutas críticas DEBEN funcionar desde 360 px hasta escritorio sin pérdida de función.
2. LA venta común de una línea y un pago DEBERÍA completarse en menos de 60 segundos en prueba moderada de usabilidad.
3. LA interfaz DEBE cumplir WCAG 2.2 AA, navegación por teclado, foco visible y objetivos táctiles de 44 px.
4. TODA operación asíncrona DEBE tener estados de carga, vacío, error y éxito apropiados.
5. EL sistema DEBE advertir pérdida de cambios y prevenir doble envío.
6. LA aplicación NO DEBE usar `window.alert`, `window.confirm` ni `window.prompt`; confirmaciones, solicitudes de motivo y formularios emergentes DEBEN implementarse como diálogos Angular accesibles, localizados, con foco contenido y restaurado.
7. TODO formulario DEBE mostrar el error junto al campo afectado después de la interacción o del intento de envío, marcar el control inválido mediante atributos accesibles y presentar un resumen visible dentro del formulario o diálogo, nunca detrás de una ventana emergente.
8. LAS validaciones nativas bloqueantes del navegador NO DEBEN sustituir los mensajes Angular localizados; el foco DEBE desplazarse al resumen o al primer control inválido cuando el usuario intenta enviar datos incorrectos.
9. LAS operaciones exitosas relevantes DEBEN mostrar confirmación visible y localizada. Al registrar una venta, la confirmación DEBE ser un diálogo Angular destacado con folio, total y acciones para registrar otra venta o ir al listado.

### REQ-NFR-002 — Rendimiento (Must)

1. EL p95 de endpoints CRUD DEBERÍA ser menor a 500 ms y el de reportes menores a 2 s con 100.000 ventas en el entorno de referencia.
2. LAS listas DEBEN paginar del lado servidor; no descargar colecciones completas.
3. LA carga inicial comprimida de la SPA DEBERÍA respetar budgets definidos durante bootstrap y lazy loading por feature.
4. LAS consultas de reporte DEBEN contar con índices verificados mediante plan de ejecución.

### REQ-NFR-003 — Seguridad y privacidad (Must)

1. EL SISTEMA DEBE cumplir el steering de seguridad, aplicar RBAC en backend y evitar IDOR.
2. CONTRASEÑAS DEBEN almacenarse con Argon2id y los refresh tokens solo como hash.
3. LA aplicación DEBE usar TLS en producción, cookies seguras y cabeceras defensivas.
4. ERRORES Y LOGS NO DEBEN filtrar secretos, consultas, stack traces o datos innecesarios.
5. EL sistema DEBE validar y limitar toda entrada y exportación.

### REQ-NFR-004 — Portabilidad y entrega (Must)

1. UN compañero con Git, Docker Engine y Docker Compose DEBE instalar el sistema desde cero mediante README y un comando principal.
2. `docker compose up --build` DEBE levantar aplicación y MySQL saludables sin instalaciones globales de Angular/Node.
3. LAS migraciones DEBEN ejecutarse de forma segura y el seed DEBE ser idempotente.
4. LOS scripts DEBEN funcionar en PowerShell y Bash o delegar en comandos npm portables.
5. LA base DEBE persistir al detener contenedores y no borrarse con el script normal de apagado.
6. DEBEN existir procedimientos probados de backup y restore.

### REQ-NFR-005 — Mantenibilidad y calidad (Must)

1. FRONTEND y backend DEBEN usar TypeScript estricto y límites modulares descritos en steering.
2. EL contrato OpenAPI, migraciones y lockfile DEBEN versionarse.
3. CI DEBE ejecutar format check, lint, typecheck, tests, build y escaneos básicos.
4. REGLAS críticas de dinero, permisos, fechas y exportación DEBEN tener pruebas unitarias e integración.
5. NINGÚN cambio DEBE mezclar una modificación de esquema no compatible sin su migración y estrategia de despliegue.

## 4. Matriz de permisos verificable

| Recurso/acción | Admin | Senior | Assistant |
|---|:---:|:---:|:---:|
| `sales:create` | Sí | Sí | Sí, hoy |
| `sales:read:own` | Sí | Sí | Sí |
| `sales:read:any` | Sí | No | No |
| `sales:update:any` | Sí | No | No |
| `sales:void:any` | Sí | No | No |
| `reports:read` | Día/semana/mes/año/rango | Día/mes | No |
| `reports:export` | Día/semana/mes/año/rango | Día/mes | No |
| `catalog:manage` | Sí | No | No |
| `users:manage` | Sí | No | No |
| `audit:read` | Sí | No | No |
| `preferences:update:own` | Sí | Sí | Sí |

## 5. Preguntas abiertas no bloqueantes

1. Confirmar si se necesitan datos de cliente. El MVP no los almacena.
2. Confirmar si “bono regalo” y “bono pagado” deben tener saldo/código; en MVP son solo medios de pago administrables.
