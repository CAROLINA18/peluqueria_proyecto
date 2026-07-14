#!/usr/bin/env sh
set -eu

INSTALL_DEPENDENCIES=0
OPEN_BROWSER=1

for argument in "$@"; do
  case "$argument" in
    --install-dependencies) INSTALL_DEPENDENCIES=1 ;;
    --no-open) OPEN_BROWSER=0 ;;
    *) echo "Opción desconocida: $argument"; exit 2 ;;
  esac
done

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

command -v docker >/dev/null 2>&1 || { echo 'Docker no está instalado o no está disponible en PATH.'; exit 1; }
docker info >/dev/null 2>&1 || { echo 'Docker no está iniciado.'; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  echo '✓ Archivo .env creado desde .env.example.'
else
  echo '✓ Se conservará el archivo .env existente.'
fi

if [ "$INSTALL_DEPENDENCIES" -eq 1 ]; then
  command -v npm >/dev/null 2>&1 || { echo 'npm no está disponible. Instala Node.js 24 o no uses --install-dependencies.'; exit 1; }
  echo 'Instalando dependencias locales para desarrollo…'
  npm ci
else
  echo 'ℹ Instalación local omitida. Docker instalará lo necesario dentro de la imagen.'
fi

echo 'Construyendo y levantando aplicación y MySQL…'
docker compose up --build -d

URL='http://localhost:8080'
READY=0
if command -v curl >/dev/null 2>&1; then
  attempt=1
  while [ "$attempt" -le 60 ]; do
    if curl --fail --silent "$URL/health/ready" >/dev/null 2>&1; then READY=1; break; fi
    sleep 2
    attempt=$((attempt + 1))
  done
else
  sleep 10
  READY=1
fi

if [ "$READY" -ne 1 ]; then
  docker compose ps
  echo 'La aplicación no respondió a tiempo. Revisa: docker compose logs app'
  exit 1
fi

echo '✓ Proyecto listo'
echo "  Aplicación: $URL"
echo '  Usuario: admin'
echo '  Contraseña: ChangeMe123!'
echo '  Detener: docker compose down'

if [ "$OPEN_BROWSER" -eq 1 ]; then
  if command -v open >/dev/null 2>&1; then open "$URL"; fi
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 || true; fi
fi
