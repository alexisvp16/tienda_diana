param(
    [string]$OutputDirectory = (Join-Path (Split-Path $PSScriptRoot -Parent) 'backups')
)

$ErrorActionPreference = 'Stop'
$backendDirectory = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $backendDirectory '.env'

if (-not (Test-Path -LiteralPath $envFile)) {
    throw 'No se encontró backend/.env. No se puede crear el respaldo.'
}

$settings = @{}
Get-Content -LiteralPath $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.*)\s*$') {
        $settings[$Matches[1]] = $Matches[2]
    }
}

$dumpCommand = Get-Command mysqldump -ErrorAction SilentlyContinue
$dumpPath = if ($dumpCommand) {
    $dumpCommand.Source
} else {
    @(
        'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe',
        'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe'
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

if (-not $dumpPath) {
    throw 'No se encontró mysqldump. Instale MySQL Server o agregue mysqldump al PATH.'
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

$databaseName = if ($settings['DB_NAME']) { $settings['DB_NAME'] } else { 'tienda_diana_db' }
$databaseHost = if ($settings['DB_HOST']) { $settings['DB_HOST'] } else { '127.0.0.1' }
$databasePort = if ($settings['DB_PORT']) { $settings['DB_PORT'] } else { '3306' }
$databaseUser = $settings['DB_USER']
$databasePassword = $settings['DB_PASSWORD']

if ([string]::IsNullOrWhiteSpace($databaseUser)) {
    throw 'DB_USER no está configurado en backend/.env.'
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupFile = Join-Path $OutputDirectory "$databaseName-$timestamp.sql"
$defaultsFile = Join-Path $env:TEMP "tiendadiana-mysql-$PID.cnf"

try {
    @(
        '[client]',
        "host=$databaseHost",
        "port=$databasePort",
        "user=$databaseUser",
        "password=$databasePassword"
    ) | Set-Content -LiteralPath $defaultsFile -Encoding utf8 -NoNewline

    & $dumpPath "--defaults-extra-file=$defaultsFile" '--single-transaction' '--routines' '--triggers' '--events' '--default-character-set=utf8mb4' $databaseName |
        Out-File -LiteralPath $backupFile -Encoding utf8

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $backupFile)) {
        throw 'mysqldump no pudo completar el respaldo.'
    }

    $hash = (Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash
    Set-Content -LiteralPath "$backupFile.sha256" -Value "$hash  $(Split-Path $backupFile -Leaf)" -Encoding ascii
    Write-Host "Respaldo creado: $backupFile"
} finally {
    Remove-Item -LiteralPath $defaultsFile -Force -ErrorAction SilentlyContinue
}
