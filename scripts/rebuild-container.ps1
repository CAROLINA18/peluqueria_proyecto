param(
  [switch]$NoCache,
  [switch]$ShowLogs,
  [ValidateRange(10, 300)]
  [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Invoke-DockerCompose {
  param([Parameter(Mandatory)][string[]]$Arguments)

  & docker compose @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose termino con el codigo $LASTEXITCODE."
  }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker no esta instalado o no esta disponible en PATH.'
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker Desktop no esta iniciado. Inicialo y vuelve a ejecutar el script.'
}

Write-Host 'Reconstruyendo la aplicacion...' -ForegroundColor Cyan
if ($NoCache) {
  Invoke-DockerCompose -Arguments @('build', '--no-cache', 'app')
  Invoke-DockerCompose -Arguments @('up', '-d', '--force-recreate', 'app')
} else {
  Invoke-DockerCompose -Arguments @('up', '--build', '-d', '--force-recreate', 'app')
}

$containerId = (& docker compose ps -q app).Trim()
if ($LASTEXITCODE -ne 0 -or -not $containerId) {
  throw 'No fue posible obtener el contenedor de la aplicacion.'
}

Write-Host 'Esperando a que la aplicacion este saludable...' -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$health = ''
do {
  $health = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $containerId).Trim()
  if ($LASTEXITCODE -ne 0) { throw 'No fue posible consultar el estado del contenedor.' }
  if ($health -eq 'healthy') { break }
  if ($health -in @('unhealthy', 'exited', 'dead')) {
    Invoke-DockerCompose -Arguments @('logs', '--tail', '80', 'app')
    throw "El contenedor termino con estado '$health'."
  }
  Start-Sleep -Seconds 2
} while ((Get-Date) -lt $deadline)

if ($health -ne 'healthy') {
  Invoke-DockerCompose -Arguments @('logs', '--tail', '80', 'app')
  throw "La aplicacion no estuvo saludable despues de $TimeoutSeconds segundos."
}

$publishedPort = (& docker compose port app 3000).Trim()
$url = if ($publishedPort -match ':(\d+)$') { "http://localhost:$($Matches[1])" } else { 'http://localhost:8080' }

Write-Host ''
Write-Host 'Contenedor reconstruido y reiniciado correctamente.' -ForegroundColor Green
Write-Host "  Aplicacion: $url"
Write-Host '  Logs: docker compose logs -f app'

if ($ShowLogs) {
  Invoke-DockerCompose -Arguments @('logs', '-f', 'app')
}
