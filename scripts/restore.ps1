param([Parameter(Mandatory=$true)][string]$File)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $File)) { throw "No existe: $File" }
$resolved = (Resolve-Path -LiteralPath $File).Path
$answer = Read-Host "Esto reemplazará datos de la base. Escribe RESTAURAR para continuar"
if ($answer -ne 'RESTAURAR') { Write-Host 'Cancelado'; exit 1 }
Get-Content -Raw -LiteralPath $resolved | docker compose exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
Write-Host 'Restauración completada.'
