param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

$ErrorActionPreference = 'Stop'
$backendDirectory = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $backendDirectory '.env'

if (-not (Test-Path -LiteralPath $BackupFile)) {
    throw 'No se encontró el archivo de respaldo indicado.'
}

if (-not (Test-Path -LiteralPath $envFile)) {
    throw 'No se encontró backend/.env.'
}

Write-Warning 'Restaurar reemplaza los datos actuales de la base de datos.'
$confirmation = Read-Host 'Escriba RESTAURAR para continuar'
if ($confirmation -ne 'RESTAURAR') {
    Write-Host 'Restauración cancelada.'
    exit 0
}

$settings = @{}
Get-Content -LiteralPath $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.*)\s*$') { $settings[$Matches[1]] = $Matches[2] }
}

$mysqlPath = @(
    'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe',
    'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $mysqlPath) { throw 'No se encontró mysql.exe.' }

$defaultsFile = Join-Path $env:TEMP "tiendadiana-mysql-$PID.cnf"
try {
    @(
        '[client]',
        "host=$(if ($settings['DB_HOST']) { $settings['DB_HOST'] } else { '127.0.0.1' })",
        "port=$(if ($settings['DB_PORT']) { $settings['DB_PORT'] } else { '3306' })",
        "user=$($settings['DB_USER'])",
        "password=$($settings['DB_PASSWORD'])"
    ) |
        Set-Content -LiteralPath $defaultsFile -Encoding utf8 -NoNewline
    $databaseName = if ($settings['DB_NAME']) { $settings['DB_NAME'] } else { 'tienda_diana_db' }
    Get-Content -LiteralPath $BackupFile -Raw | & $mysqlPath "--defaults-extra-file=$defaultsFile" $databaseName
    if ($LASTEXITCODE -ne 0) { throw 'La restauración falló.' }
    Write-Host 'Restauración completada.'
} finally {
    Remove-Item -LiteralPath $defaultsFile -Force -ErrorAction SilentlyContinue
}
