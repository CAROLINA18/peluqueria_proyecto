# Steering tecnológico

## Estilo arquitectónico

La solución es un **monolito modular** y un único producto desplegable:

- Angular implementa la SPA.
- Node.js con Express implementa API, autenticación, reglas de negocio, reportes y exportaciones.
- En producción, Express sirve los archivos compilados de Angular y expone `/api/v1`.
- MySQL es el único almacén persistente y se ejecuta en una imagen oficial de Docker.
- Docker Compose levanta `app` y `db`; no se introducen colas, cachés distribuidas ni microservicios en el MVP.

En desarrollo se permiten procesos separados para recarga rápida, manteniendo los mismos contratos.

## Stack obligatorio

- **Frontend**: Angular, TypeScript estricto, Angular Router, formularios reactivos y Signals para estado local.
- **Internacionalización**: traducciones runtime tipadas para `es` y `en`, cargadas por feature; no se permiten textos de UI incrustados fuera de los catálogos de traducción.
- **UI**: Angular Material/CDK como base accesible, tematizado con tokens propios; evitar combinar librerías de componentes.
- **Activos de marca**: originales inmutables en `logos/`; copias web optimizadas y descriptivas en `apps/web/src/assets/brand/`, generadas por script reproducible.
- **Backend**: Node.js LTS, Express 5, TypeScript estricto.
- **Persistencia**: MySQL 8.4 LTS y ORM Prisma con migraciones versionadas.
- **Validación**: esquemas Zod compartidos cuando sea razonable; el backend vuelve a validar toda entrada.
- **Autenticación**: sesión mediante access token de vida corta en memoria y refresh token rotatorio en cookie `HttpOnly`, `Secure` en producción y `SameSite=Strict`.
- **Contraseñas**: Argon2id; nunca se registran secretos o hashes en logs.
- **Reportes**: consultas agregadas SQL/ORM; PDF generado en servidor y XLSX generado en servidor.
- **Pruebas**: Vitest/Supertest en backend, Angular testing utilities en frontend y Playwright para flujos críticos.
- **Calidad**: ESLint, Prettier, cobertura y auditoría de dependencias automatizadas.
- **API**: REST JSON bajo `/api/v1`, descrita con OpenAPI 3.1 y respuestas de error compatibles con RFC 9457 (`application/problem+json`).

## Política de versiones

- Al inicializar el código se eligen versiones estables/LTS compatibles y se fijan exactamente en `package.json`, lockfile, Dockerfiles y Compose.
- El repositorio incluye un solo lockfile en la raíz mediante npm workspaces.
- No se usan tags flotantes como `latest` en imágenes de producción.
- Una actualización mayor requiere decisión documentada, migración y ejecución completa de pruebas.

## Configuración

Toda configuración varía por entorno y se inyecta mediante variables; nunca se confirma `.env` con secretos.

Variables mínimas:

| Variable | Propósito |
|---|---|
| `NODE_ENV` | `development`, `test` o `production` |
| `PORT` | Puerto HTTP del monolito |
| `DATABASE_URL` | Conexión MySQL |
| `MYSQL_DATABASE` | Base creada por la imagen |
| `MYSQL_USER` / `MYSQL_PASSWORD` | Credenciales de aplicación |
| `MYSQL_ROOT_PASSWORD` | Administración exclusiva del contenedor |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Firma de tokens distintos |
| `APP_TIMEZONE` | Zona horaria IANA del negocio; valor requerido `Europe/Brussels` |
| `APP_CURRENCY` | Código ISO-4217; valor requerido `EUR` |
| `APP_DEFAULT_LOCALE` | Idioma inicial; valor requerido `es` |
| `APP_BUSINESS_NAME` | Nombre corporativo; valor requerido `Lina Quirama Beauty Salon` |
| `CORS_ORIGIN` | Solo para desarrollo con orígenes separados |
| `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` | Bootstrap controlado del primer administrador |

Se entrega `.env.example` sin secretos y el arranque falla pronto con un mensaje claro si falta una variable.

## Entornos y contenedores

- `compose.yaml`: producción/local reproducible, con volúmenes nombrados, healthchecks y red privada.
- `compose.dev.yaml`: opcional para desarrollo con recarga y puertos explícitos.
- `Dockerfile`: multi-stage, usuario no root, imagen final mínima, healthcheck HTTP y solo artefactos necesarios.
- MySQL no publica su puerto en despliegue de producción; solo `app` lo alcanza por la red interna.
- La aplicación espera a que MySQL esté saludable y ejecuta migraciones de forma idempotente antes de iniciar.
- Los datos viven en un volumen nombrado y se documentan backup, restore y actualización.

## Scripts de equipo requeridos

Los scripts deben existir tanto en Bash (`scripts/*.sh`) como PowerShell (`scripts/*.ps1`) cuando interactúen con el sistema operativo y delegar en npm/Docker para no duplicar lógica.

| Comando npm | Resultado esperado |
|---|---|
| `npm run setup` | valida herramientas, instala dependencias y crea `.env` desde el ejemplo sin sobrescribir |
| `npm run dev` | levanta MySQL y ejecuta frontend/backend con recarga |
| `npm run build` | compila todos los workspaces |
| `npm run test` | pruebas unitarias e integración |
| `npm run test:e2e` | entorno aislado y Playwright |
| `npm run lint` | lint y comprobación de formato |
| `npm run db:migrate` | aplica migraciones pendientes |
| `npm run db:seed` | carga catálogos demo idempotentes fuera de producción |
| `npm run docker:up` | construye y levanta el stack |
| `npm run docker:down` | detiene sin borrar volúmenes |
| `npm run backup` | crea backup fechado sin exponer contraseña |
| `npm run restore -- <archivo>` | restaura previa confirmación y validación |

El README raíz tendrá rutas “inicio en 5 minutos” para Windows, macOS y Linux.
