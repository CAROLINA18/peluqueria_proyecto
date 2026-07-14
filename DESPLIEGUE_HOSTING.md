# Despliegue en hosting

Esta guía permite publicar Lina Quirama Beauty Salon en cualquier proveedor que admita contenedores Docker o Node.js 24 con una base MySQL 8.4 compatible. Un hosting compartido limitado a PHP no es suficiente.

## Opción recomendada: servidor o VPS con Docker

Requisitos:

- Ubuntu 22.04/24.04 o equivalente con al menos 2 GB de RAM.
- Docker Engine y Docker Compose v2.
- Un dominio apuntando a la IP del servidor.
- Puertos 80 y 443 abiertos. MySQL no debe exponerse a Internet.

### 1. Copiar el proyecto

```bash
git clone URL_DEL_REPOSITORIO lina-quirama-beauty
cd lina-quirama-beauty
cp .env.example .env
```

Si se entrega como ZIP, descomprímelo y entra en la carpeta. No es necesario ejecutar `npm install`.

### 2. Configurar secretos

Edita `.env` y reemplaza como mínimo:

```dotenv
NODE_ENV=production
MYSQL_DATABASE=lq_beauty
MYSQL_USER=lq_app
MYSQL_PASSWORD=UNA_CLAVE_MYSQL_LARGA_Y_UNICA
MYSQL_ROOT_PASSWORD=OTRA_CLAVE_ROOT_LARGA_Y_UNICA
JWT_ACCESS_SECRET=SECRETO_ALEATORIO_DE_64_CARACTERES_O_MAS
JWT_REFRESH_SECRET=OTRO_SECRETO_ALEATORIO_DE_64_CARACTERES_O_MAS
ADMIN_EMAIL=correo-real-del-administrador@dominio.com
ADMIN_USERNAME=admin
ADMIN_INITIAL_PASSWORD=CONTRASENA_TEMPORAL_SEGURA
APP_PORT=8080
```

Los dos secretos JWT deben ser distintos. No publiques `.env` ni lo subas al repositorio.

### 3. Levantar la aplicación

```bash
docker compose up --build -d
docker compose ps
curl http://127.0.0.1:8080/health/ready
```

La respuesta esperada es:

```json
{"status":"ready","business":"Lina Quirama Beauty Salon"}
```

El contenedor ejecuta automáticamente las migraciones pendientes y crea el administrador inicial solo cuando no existe.

### 4. Configurar dominio y HTTPS

La aplicación debe publicarse con HTTPS porque las cookies de sesión de producción son seguras. Por ejemplo, con Caddy:

```caddyfile
beauty.tudominio.com {
    reverse_proxy 127.0.0.1:8080
}
```

Con Nginx, configura un `proxy_pass http://127.0.0.1:8080`, conserva los encabezados `Host`, `X-Forwarded-For` y `X-Forwarded-Proto`, y usa Certbot para TLS. Expón solamente el proxy; mantén el puerto 8080 restringido por firewall cuando sea posible.

### 5. Primer acceso

Inicia sesión con `ADMIN_USERNAME` y `ADMIN_INITIAL_PASSWORD`. Cambia inmediatamente la contraseña temporal desde una conexión HTTPS.

## Plataformas administradas

También puede usarse Render, Railway, Fly.io, Azure Container Apps, Google Cloud Run, AWS ECS, DigitalOcean App Platform u otro proveedor equivalente.

Configura:

- Build mediante el `Dockerfile` de la raíz.
- Puerto interno `3000`.
- Health check `/health/ready`.
- Una instancia MySQL persistente o MySQL administrado.
- Todas las variables de producción indicadas arriba.
- `DATABASE_URL` con el formato `mysql://USUARIO:CLAVE@HOST:3306/BASE`.
- Volumen persistente solo si MySQL se ejecuta como contenedor. La aplicación Node no necesita disco persistente.

Si la plataforma ofrece MySQL administrado, despliega únicamente el contenedor `app`; no uses el servicio `db` de `compose.yaml`. Verifica que la base acepte conexiones desde la aplicación y tenga TLS cuando el proveedor lo requiera.

## Actualizaciones

```bash
git pull
docker compose up --build -d
docker compose ps
curl http://127.0.0.1:8080/health/ready
```

Las migraciones se aplican al arrancar. Realiza una copia antes de actualizar:

```powershell
npm run backup
```

En Linux puede usarse directamente `mysqldump` dentro del contenedor:

```bash
mkdir -p backups
docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > "backups/lq-beauty-$(date +%Y%m%d-%H%M%S).sql"
```

## Verificación posterior

- `docker compose ps` muestra `app` y `db` como `healthy`.
- `/health/ready` responde `ready`.
- El dominio carga por HTTPS sin advertencias.
- Se puede iniciar y cerrar sesión.
- El administrador puede crear un servicio y una venta de prueba.
- PDF y Excel se descargan correctamente.
- La zona horaria es `Europe/Brussels` y la moneda es EUR.
- Existe una copia de seguridad automática y se ha probado su restauración.

## Operación y diagnóstico

```bash
docker compose logs -f app
docker compose logs -f db
docker compose restart app
docker compose down
```

`docker compose down` conserva la base. No uses `docker compose down -v` en producción: elimina el volumen con los datos.
