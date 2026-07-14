$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path 'backups' | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file = "backups/lq-beauty-$stamp.sql"
docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' | Set-Content -Encoding utf8 $file
Write-Host "Backup creado: $file"
