# Guía de instalación y arranque para el equipo

Esta guía permite levantar Lina Quirama Beauty Salon en un computador nuevo. La forma recomendada usa Docker y **no requiere instalar Node.js ni ejecutar `npm install`**.

## Requisitos

- Git.
- Docker Desktop en Windows/macOS, o Docker Engine con Compose en Linux.
- Puertos `8080` disponibles. MySQL permanece dentro de Docker y no expone su puerto en producción.

## Opción A — Arranque automático recomendado

### Windows PowerShell

Desde la carpeta del proyecto:

```powershell
.\INICIAR_PROYECTO.ps1
```

El script crea `.env` solo si no existe, construye las imágenes, levanta MySQL y la aplicación, espera el health check y abre el navegador.

La instalación local es opcional. Solo quien vaya a desarrollar necesita solicitarla:

```powershell
.\INICIAR_PROYECTO.ps1 -InstalarDependencias
```

Para no abrir el navegador:

```powershell
.\INICIAR_PROYECTO.ps1 -NoAbrirNavegador
```

### macOS o Linux

```bash
chmod +x INICIAR_PROYECTO.sh
./INICIAR_PROYECTO.sh
```

Instalación local opcional para desarrollo:

```bash
./INICIAR_PROYECTO.sh --install-dependencies
```

## Opción B — Arranque manual sin instalar dependencias

Windows:

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

macOS/Linux:

```bash
cp .env.example .env
docker compose up --build -d
```

Después abre [http://localhost:8080](http://localhost:8080).

Credenciales iniciales:

- Nombre de usuario: `admin`
- Contraseña: `ChangeMe123!`

## Verificar, detener y volver a iniciar

```bash
docker compose ps
docker compose logs -f app
docker compose down
docker compose up -d
```

`docker compose down` conserva la base de datos. No uses `docker compose down -v` salvo que realmente quieras eliminar todos los datos.

## Desarrollo local opcional

Esta modalidad sí requiere Node.js 24 y npm:

```bash
npm ci
npm run db:up
npm run db:deploy
npm run db:seed
npm run dev
```

- Angular: `http://localhost:4200`
- API: `http://localhost:3000/api/v1`
- MySQL: contenedor Docker configurado por `compose.dev.yaml`.

## Configuración antes de publicar

Edita `.env` y cambia como mínimo:

- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_INITIAL_PASSWORD`

El archivo `.env` no se versiona y los scripts nunca sobrescriben uno existente.
