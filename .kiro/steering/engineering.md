# Steering de ingeniería

## Principios

- Correctitud financiera, seguridad y trazabilidad tienen prioridad sobre conveniencia.
- El backend es la autoridad para permisos, totales y fechas de negocio.
- Cada escritura relevante es atómica e idempotente cuando el cliente pueda reintentar.
- Los errores esperables son mensajes de negocio claros; los detalles internos solo van a logs seguros.
- Las decisiones significativas se documentan en ADR dentro de `docs/adr/`.

## Seguridad

- Aplicar mínimo privilegio según la matriz de producto en cada caso de uso.
- Rate limiting en login, refresh y exportaciones.
- Bloqueo temporal progresivo tras intentos fallidos, sin revelar si el correo existe.
- Tokens de refresh almacenados como hash, rotados en cada uso y revocables por sesión.
- CSRF protegido mediante SameSite estricto y token CSRF en operaciones autenticadas basadas en cookie.
- Cabeceras seguras con Helmet, CSP compatible con Angular y TLS obligatorio fuera de local.
- Consultas parametrizadas mediante ORM; validar tamaño, tipo, enumeraciones y rango de toda entrada.
- Sanitizar nombres de archivos y escapar valores de Excel que empiecen por `=`, `+`, `-` o `@` para evitar formula injection.
- Las exportaciones respetan los mismos filtros y permisos que la vista.
- Logs sin contraseñas, tokens, cookies ni datos personales innecesarios.
- Dependencias revisadas y escaneo de contenedor/secretos en CI.

## Integridad y concurrencia

- Crear/editar/anular una venta y escribir su auditoría ocurre en una sola transacción.
- El servidor recalcula subtotales y total; nunca confía en totales enviados por el cliente.
- Escrituras de venta aceptan `Idempotency-Key`; reintentar la misma solicitud devuelve el mismo resultado.
- Ediciones administrativas usan versión optimista (`version`/`updatedAt`) y responden `409` ante conflicto.
- Los importes aceptan como máximo dos decimales en EUR y deben ser mayores que cero.
- El límite inicial es 50 líneas y 10 pagos por venta; ambos son configurables solo mediante cambio de producto.

## Auditoría

Registrar como mínimo:

- inicio de sesión exitoso/fallido y cierre/revocación de sesión;
- creación, edición, activación/desactivación de usuarios;
- creación, edición, activación/desactivación de servicios;
- creación, edición y anulación de ventas;
- exportación de reportes.

Cada evento incluye actor, acción, entidad, id de entidad, instante UTC, request/correlation id y cambios antes/después con campos sensibles redactados. La auditoría es append-only para la aplicación.

## Observabilidad y operación

- Logs JSON estructurados con `requestId`, nivel, ruta, estado y duración.
- `GET /health/live` no depende de MySQL; `GET /health/ready` comprueba base y migraciones.
- Métricas mínimas: latencia, tasa de error, logins fallidos, ventas creadas y duración de reportes.
- Cierre ordenado de HTTP y conexiones de base de datos.
- Backups documentados, cifrados cuando salgan del host y restore ensayado periódicamente.
- Migraciones hacia adelante con estrategia compatible con rollback de aplicación.

## Estrategia de pruebas

- **Unitarias**: cálculo monetario, permisos, periodos, zona horaria y validadores.
- **Integración**: repositorios contra MySQL real en contenedor, transacciones, constraints y endpoints con Supertest.
- **Contrato**: OpenAPI validada y DTO compartidos sin divergencia.
- **Frontend**: componentes críticos, formularios dinámicos, estados de carga/error/vacío y guards.
- **Internacionalización**: paridad de claves `es`/`en`, fallback, formatos, cambio sin recarga y ausencia de claves internas visibles.
- **E2E**: login por perfil, venta con precio modificado, pago dividido, permisos negativos, reportes y descargas.
- **Seguridad**: enumeración de usuarios, IDOR, CSRF, rate limit y formula injection en XLSX.
- **Accesibilidad**: axe en rutas críticas, teclado, foco y contraste.

Umbrales iniciales: 80% de líneas y branches global, 90% en cálculo, permisos y autenticación. La cobertura no sustituye criterios de aceptación.

## Definition of Done

Una tarea está terminada cuando:

1. cumple los criterios vinculados;
2. incluye pruebas positivas, negativas y de autorización pertinentes;
3. pasa format, lint, typecheck, unit, integration y build;
4. actualiza OpenAPI, migraciones y documentación cuando aplica;
5. es accesible y responsive en los breakpoints acordados;
6. todo texto nuevo de interfaz y exportación existe en español e inglés;
7. no introduce secretos, vulnerabilidades altas conocidas ni logs sensibles;
8. puede desplegarse desde cero y migrarse sin pasos manuales ocultos.
