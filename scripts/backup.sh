#!/usr/bin/env sh
set -eu
mkdir -p backups
file="backups/lq-beauty-$(date +%Y%m%d-%H%M%S).sql"
docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > "$file"
printf 'Backup creado: %s\n' "$file"
