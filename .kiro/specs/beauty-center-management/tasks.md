# Plan de implementación trazable

Cada bloque debe completarse con su prueba y documentación. No se avanza sobre una decisión abierta que cambie datos o permisos sin actualizar primero `requirements.md` y `design.md`.

## Fase 0 — Validación de producto

- [x] 0.1 Registrar EUR, `Europe/Brussels`, `Lina Quirama Beauty Salon` y los dos archivos de `logos/` como decisiones confirmadas; la dirección queda opcional. `[PRODUCT, REQ-REPORT-001, REQ-EXPORT-001, REQ-BRAND-001]`
- [x] 0.2 Confirmar si los bonos requieren saldo/código o continúan como medios de pago administrables. `[REQ-CAT-001, REQ-SALE-001]`
- [ ] 0.3 Hacer wireframe responsive del flujo de venta dinámica y validarlo con un usuario real. `[REQ-NFR-001]`
- [x] 0.4 Registrar decisiones resultantes y cerrar preguntas abiertas. `[STEERING]`

**Checkpoint:** vocabulario, permisos y flujo principal aprobados.

## Fase 1 — Bootstrap reproducible

- [ ] 1.1 Crear npm workspaces `apps/web`, `apps/api`, `packages/contracts`, `packages/config` y `packages/ui-tokens`. `[REQ-NFR-005]`
- [x] 1.2 Inicializar Angular standalone/strict y Express/TypeScript strict con health endpoints. `[REQ-NFR-005]`
- [ ] 1.3 Configurar ESLint, Prettier, Vitest, Playwright, scripts raíz y hooks opcionales. `[REQ-NFR-005]`
- [x] 1.4 Crear `.env.example` y validación tipada con fallo temprano. `[REQ-NFR-004]`
- [x] 1.5 Crear Dockerfile multi-stage, `compose.yaml`, healthchecks y volumen MySQL. `[REQ-NFR-004]`
- [x] 1.6 Implementar scripts setup/dev/build/test/migrate/seed/up/down/backup/restore para PowerShell y Bash. `[REQ-NFR-004]`
- [x] 1.7 Escribir README “inicio en 5 minutos” y runbook de backup/restore. `[REQ-NFR-004]`
- [ ] 1.8 Añadir CI con MySQL real y build del contenedor. `[REQ-NFR-005]`
- [ ] 1.9 Crear pipeline reproducible que preserve originales y genere variantes web optimizadas de ambos logotipos. `[REQ-BRAND-001]`

**Checkpoint:** un compañero clona, ejecuta un comando, abre health y conserva datos tras reinicio.

## Fase 2 — Base de datos, contratos y seguridad transversal

- [x] 2.1 Modelar Prisma completo, constraints, índices y primera migración. `[DESIGN §4]`
- [x] 2.2 Crear seed idempotente con admin de desarrollo, categorías, servicios de muestra y medios de pago administrables. `[REQ-CAT-001, REQ-NFR-004]`
- [ ] 2.3 Definir contratos Zod/DTO y OpenAPI 3.1 para auth, usuarios, servicios, ventas, reportes y errores. `[REQ-NFR-005]`
- [x] 2.4 Implementar middleware de problem details, request id, logs redactados, Helmet, CORS dev y rate limit. `[REQ-NFR-003]`
- [x] 2.5 Implementar aritmética decimal, fechas de negocio y políticas RBAC como módulos probados. `[REQ-SALE-001, REQ-REPORT-001]`
- [x] 2.6 Implementar auditoría append-only y helper transaccional. `[REQ-AUDIT-001]`
- [ ] 2.7 Probar constraints, transacciones, zona horaria, dinero y capacidades con MySQL. `[REQ-NFR-005]`
- [x] 2.8 Crear infraestructura i18n, catálogos base `es`/`en`, verificación de claves y preferencia `preferredLocale`. `[REQ-I18N-001]`

**Checkpoint:** modelo migrable y políticas críticas cubiertas antes de exponer CRUD.

## Fase 3 — Autenticación y usuarios

- [x] 3.1 Implementar Argon2id, login genérico, access token corto, refresh rotatorio y logout. `[REQ-AUTH-001]`
- [ ] 3.2 Implementar revocación por desactivación/cambio de rol, bloqueo progresivo y auditoría. `[REQ-AUTH-001]`
- [x] 3.3 Implementar CRUD de usuarios, password temporal y protección del último admin. `[REQ-USER-001]`
- [x] 3.4 Crear sesión frontend, interceptor de refresh único, guards y pantalla login accesible. `[REQ-AUTH-001, REQ-NFR-001]`
- [x] 3.5 Crear UI de usuarios solo admin con estados completos y confirmaciones específicas. `[REQ-USER-001]`
- [ ] 3.6 Ejecutar pruebas negativas de sesión, CSRF, enumeración, rol e IDOR. `[REQ-NFR-003]`
- [x] 3.7 Implementar `/users/me/preferences`, selector ES/EN y restauración del idioma al autenticar. `[REQ-I18N-001]`

**Checkpoint:** los tres perfiles autentican y la matriz base es imposible de eludir por API.

## Fase 4 — Catálogos administrativos

- [x] 4.1 Implementar repositorios/casos de uso/endpoints de servicios, categorías y medios de pago con normalización, orden y baja lógica. `[REQ-SVC-001, REQ-CAT-001]`
- [x] 4.2 Crear centro de catálogos admin responsive con formularios completos para buscar, crear, editar todos los campos, ordenar, activar y desactivar opciones mediante diálogos Angular accesibles. `[REQ-SVC-001, REQ-CAT-001, REQ-NFR-001]`
- [ ] 4.3 Crear autocomplete de servicios y lista desplegable de medios de pago activos reutilizables en ventas. `[REQ-SVC-001, REQ-CAT-001]`
- [ ] 4.4 Probar históricos con opciones inactivas/renombradas, duplicados, último medio activo, precios y permisos por rol. `[REQ-SVC-001, REQ-CAT-001]`

**Checkpoint:** catálogo administrable y selector rápido con datos reales.

## Fase 5 — Ventas, núcleo del MVP

- [x] 5.1 Implementar creación transaccional, snapshots, cálculo servidor, pagos divididos e idempotencia. `[REQ-SALE-001]`
- [x] 5.2 Aplicar fecha actual y ownership del asistente dentro de consultas/casos de uso. `[REQ-SALE-002]`
- [x] 5.3 Aplicar permisos del senior y pruebas negativas. `[REQ-SALE-003]`
- [ ] 5.4 Implementar listado/detalle paginado y filtros con scope por rol. `[REQ-SALE-002, REQ-SALE-004]`
- [x] 5.5 Implementar edición optimista y anulación admin con motivo/auditoría. `[REQ-SALE-004]`
- [x] 5.6 Crear formulario Angular dinámico de líneas y pagos, selector de medio, precio editable, nota obligatoria al cambiarlo y resumen fijo. `[REQ-SALE-001, REQ-CAT-001, REQ-NFR-001]`
- [ ] 5.7 Implementar protección de cambios, doble envío, foco en error y confirmación de éxito. `[REQ-NFR-001]`
- [ ] 5.8 Crear listas/detalles responsive y acciones condicionadas por capacidad. `[REQ-SALE-004]`
- [ ] 5.9 Probar E2E: venta simple, varios servicios, pago dividido, override, reintento, conflicto y tres roles. `[REQ-SALE-001…004]`

**Checkpoint:** operación diaria completa, segura y usable desde móvil.

## Fase 6 — Reportes y exportaciones

- [x] 6.1 Implementar periodos día/semana/mes/año/rango para admin y restricción estricta día/mes para senior, con consultas agregadas indexadas. `[REQ-REPORT-001]`
- [x] 6.2 Implementar DTO `ReportSnapshot` y reconciliación de líneas/pagos/total. `[REQ-REPORT-001]`
- [x] 6.3 Crear pantalla con filtros, KPIs, desgloses, tabla accesible y estados vacíos. `[REQ-REPORT-001, REQ-NFR-001]`
- [x] 6.4 Implementar PDF A4 con sello oficial y cabecera `Lina Quirama Beauty Salon`, paginación y datos del periodo. `[REQ-EXPORT-001, REQ-BRAND-001]`
- [x] 6.5 Ampliar el XLSX de cuatro hojas con resumen analítico y detalle cruzable por venta, usuario, servicio, precios y pagos, conservando formatos y mitigación de formula injection. `[REQ-EXPORT-001]`
- [x] 6.6 Aplicar autorización/rate limit/auditoría a ambas exportaciones. `[REQ-EXPORT-001]`
- [ ] 6.7 Probar igualdad UI/PDF/XLSX con datos, sin datos, anulaciones y bordes de periodo. `[REQ-REPORT-001, REQ-EXPORT-001]`
- [x] 6.8 Traducir PDF/XLSX según preferencia y probar títulos, hojas, fechas e importes en `es` y `en`. `[REQ-I18N-001, REQ-EXPORT-001]`
- [ ] 6.9 Medir consultas con 100.000 ventas y ajustar índices según `EXPLAIN`. `[REQ-NFR-002]`

**Checkpoint:** admin obtiene todos los periodos, senior solo día/mes con archivos consistentes y assistant recibe denegación.

## Fase 7 — Dashboard, auditoría y pulido

- [x] 7.1 Crear dashboard específico por perfil. `[REQ-DASH-001]`
- [ ] 7.2 Implementar consulta y UI de auditoría para admin. `[REQ-AUDIT-001]`
- [x] 7.3 Derivar y aplicar tokens visuales de los logos, crear `BrandLogoComponent` y completar responsive, skeletons, vacíos y errores. `[REQ-BRAND-001, REQ-NFR-001]`
- [x] 7.3.1 Validar contraste de todas las parejas de texto/fondo y estados interactivos antes de aprobar el tema. `[REQ-BRAND-001, REQ-NFR-001]`
- [ ] 7.4 Ejecutar auditoría WCAG 2.2 AA automatizada y manual con teclado/lector. `[REQ-NFR-001]`
- [x] 7.4.1 Sustituir todos los `alert`/`confirm`/`prompt` nativos por diálogos Angular accesibles y localizados. `[REQ-NFR-001, UX]`
- [x] 7.4.2 Unificar validaciones por campo, resúmenes de error dentro del contexto activo y confirmaciones de éxito visibles en todos los formularios. `[REQ-NFR-001, UX]`
- [ ] 7.5 Verificar budgets, lazy loading y p95 del entorno de referencia. `[REQ-NFR-002]`
- [x] 7.6 Revisar textos en español, localización de EUR/fechas y mensajes de negocio. `[UX]`
- [x] 7.7 Completar inglés, revisar expansión de textos, fallback, cambio en caliente y ausencia de claves visibles. `[REQ-I18N-001]`

**Checkpoint:** experiencia consistente y accesible en móvil, tableta y escritorio.

## Fase 8 — Hardening y entrega

- [ ] 8.1 Ejecutar suite RBAC/IDOR/CSRF/rate-limit/Excel injection y corregir hallazgos. `[REQ-NFR-003]`
- [ ] 8.2 Escanear dependencias, imagen y secretos; resolver vulnerabilidades altas. `[REQ-NFR-003]`
- [ ] 8.3 Ensayar instalación limpia Windows/Linux, migración, backup y restore. `[REQ-NFR-004]`
- [ ] 8.4 Probar rollback de aplicación compatible con migraciones y recuperación documentada. `[REQ-NFR-004]`
- [ ] 8.5 Completar OpenAPI, runbook operativo, credenciales iniciales y checklist de producción. `[REQ-NFR-005]`
- [ ] 8.6 Realizar aceptación con un representante de cada perfil y registrar evidencia por requisito. `[ALL]`

**Checkpoint final:** Definition of Done satisfecha y MVP desplegable sin pasos ocultos.

## Matriz mínima de pruebas E2E

| Flujo | Admin | Senior | Assistant |
|---|:---:|:---:|:---:|
| Login/logout/refresh | ✓ | ✓ | ✓ |
| Crear venta de hoy | ✓ | ✓ | ✓ |
| Crear venta con otra fecha | ✓ | ✓ | Rechazada |
| Ver venta ajena | ✓ | Solo reporte | 404 |
| Editar/anular venta | ✓ | 403 | 403 |
| Gestionar catálogos | ✓ | 403 | 403 |
| Gestionar usuarios | ✓ | 403 | 403 |
| Ver/exportar reporte día o mes | ✓ | ✓ | 403 |
| Ver/exportar reporte semana/año/rango | ✓ | 403 | 403 |
| Ver auditoría | ✓ | 403 | 403 |
| Cambiar idioma ES/EN | ✓ | ✓ | ✓ |
| Ver identidad/logos correctos en app y PDF | ✓ | ✓ | ✓ |
