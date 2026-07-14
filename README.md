# Lina Quirama Beauty Salon — MVP

Aplicación bilingüe para administrar servicios, ventas y reportes de Lina Quirama Beauty Salon. Es un monolito modular: Angular 21 y Express 5 se entregan en una sola imagen; MySQL 8.4 conserva los datos en un volumen Docker.

## Capacidades incluidas

- Login seguro con access token corto y refresh token rotatorio en cookie HttpOnly.
- Perfiles Administrador, Asistente senior y Asistente con autorización en backend.
- Usuarios, categorías, catálogo de servicios y medios de pago administrables.
- Venta con servicios dinámicos, pagos divididos y snapshot de precios/medios.
- Nota obligatoria cuando se cambia el precio precargado.
- Anulación lógica y auditoría de operaciones relevantes.
- Reportes por día/semana/mes/año para administrador y día/mes para senior.
- Exportación PDF y XLSX localizada en español o inglés.
- Interfaz responsive con logos oficiales y paleta accesible.

## Inicio recomendado con Docker

Requisitos: Git, Docker Desktop/Engine y Docker Compose.

```bash
cp .env.example .env
docker compose up --build -d
```

En PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Abrir `http://localhost:8080`.

Credenciales locales iniciales:

- Correo: `admin@linaquirama.local`
- Contraseña: `ChangeMe123!`

Antes de desplegar, cambie `MYSQL_*`, `JWT_*`, `ADMIN_EMAIL` y `ADMIN_INITIAL_PASSWORD` en `.env`. La aplicación fuerza cambio de contraseña inicial cuando `NODE_ENV=production`.

## Desarrollo

```powershell
npm run setup
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
```

- Angular: `http://localhost:4200`
- API: `http://localhost:3000/api/v1`
- Health: `http://localhost:3000/health/ready`

Comandos principales:

| Comando | Acción |
|---|---|
| `npm run dev` | API y Angular con recarga |
| `npm run build` | Compilación de producción |
| `npm test` | Pruebas y build de verificación |
| `npm run db:migrate` | Crea/aplica migraciones en desarrollo |
| `npm run db:deploy` | Aplica migraciones existentes |
| `npm run db:seed` | Admin y catálogos idempotentes |
| `npm run docker:up` | Construye y levanta todo |
| `npm run docker:down` | Detiene sin borrar datos |
| `npm run backup` | Backup SQL en `backups/` (PowerShell) |
| `./scripts/backup.sh` | Backup SQL en macOS/Linux |

## Roles

| Acción | Admin | Senior | Asistente |
|---|:---:|:---:|:---:|
| Registrar ventas | Sí | Sí | Solo hoy |
| Ver ventas | Todas | Propias | Propias |
| Editar/anular | Sí | No | No |
| Reportes/descargas | Todos los periodos | Día/mes | No |
| Catálogos/usuarios | Sí | No | No |

## Datos y operación

- Moneda: EUR.
- Zona horaria de negocio: `Europe/Brussels`.
- Nombre corporativo: Lina Quirama Beauty Salon.
- Los originales de `logos/` no se modifican; Angular los copia a `/brand/`.
- `docker compose down` conserva `mysql_data`. Solo `docker compose down -v` elimina datos y no forma parte de los scripts normales.

## Estructura

```text
apps/web       Angular SPA
apps/api       Express API y servidor de SPA
prisma         Modelo, migraciones y seed
logos          Activos oficiales
scripts        Setup, backup y restore
.kiro          Steering y especificaciones SDD
```

Las decisiones funcionales y criterios de aceptación están en [.kiro/README.md](.kiro/README.md).
