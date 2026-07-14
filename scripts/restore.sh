#!/usr/bin/env sh
set -eu
file="${1:?Uso: ./scripts/restore.sh archivo.sql}"
test -f "$file"
printf 'Escribe RESTAURAR para reemplazar datos: '
read answer
test "$answer" = RESTAURAR
docker compose exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < "$file"
printf 'Restauración completada.\n'
