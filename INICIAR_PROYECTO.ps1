param(
  [switch]$InstalarDependencias,
  [switch]$NoAbrirNavegador
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker no está instalado o no está disponible en PATH. Instala Docker Desktop y vuelve a ejecutar este archivo.'
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker Desktop no está iniciado. Ábrelo, espera a que esté listo y vuelve a ejecutar este archivo.'
}

if (-not (Test-Path -LiteralPath '.env')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env'
  Write-Host '✓ Archivo .env creado desde .env.example.' -ForegroundColor Green
} else {
  Write-Host '✓ Se conservará el archivo .env existente.' -ForegroundColor Green
}

if ($InstalarDependencias) {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'Solicitaste instalar dependencias, pero npm no está disponible. Instala Node.js 24 o ejecuta el script sin -InstalarDependencias.'
  }
  Write-Host 'Instalando dependencias locales para desarrollo…' -ForegroundColor Cyan
  npm ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci no pudo completar la instalación.' }
} else {
  Write-Host 'ℹ Instalación local omitida. Docker instalará lo necesario dentro de la imagen.' -ForegroundColor Yellow
}

Write-Host 'Construyendo y levantando aplicación y MySQL…' -ForegroundColor Cyan
docker compose up --build -d
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose no pudo levantar el proyecto.' }

$url = 'http://localhost:8080'
$ready = $false
for ($attempt = 1; $attempt -le 60; $attempt++) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "$url/health/ready" -TimeoutSec 2
    if ($response.StatusCode -eq 200) { $ready = $true; break }
  } catch { }
  Start-Sleep -Seconds 2
}

if (-not $ready) {
  docker compose ps
  throw 'La aplicación no respondió a tiempo. Revisa los logs con: docker compose logs app'
}

Write-Host ''
Write-Host '✓ Proyecto listo' -ForegroundColor Green
Write-Host "  Aplicación: $url"
Write-Host '  Usuario: admin'
Write-Host '  Contraseña: ChangeMe123!'
Write-Host '  Detener: docker compose down'

if (-not $NoAbrirNavegador) {
  Start-Process $url
}
