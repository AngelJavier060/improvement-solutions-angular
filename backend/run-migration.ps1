#!/usr/bin/env pwsh
# Script to execute database migration for multiple contractor companies

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Ejecutando migración de empresas contratistas" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# Check if mysql is available
$mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
if ($null -eq $mysqlPath) {
    Write-Host "MySQL no está disponible en el PATH. Buscando en ubicaciones comunes..." -ForegroundColor Yellow
    
    $commonPaths = @(
        "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
        "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
        "C:\MySQL\bin\mysql.exe",
        "C:\xampp\mysql\bin\mysql.exe",
        "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"
    )
    
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            $mysqlPath = $path
            Write-Host "MySQL encontrado en: $path" -ForegroundColor Green
            break
        }
    }
    
    if ($null -eq $mysqlPath) {
        Write-Host "Error: No se puede encontrar MySQL. Por favor instale MySQL o agregue el directorio bin al PATH." -ForegroundColor Red
        exit 1
    }
} else {
    $mysqlPath = $mysqlPath.Source
    Write-Host "MySQL encontrado en PATH: $mysqlPath" -ForegroundColor Green
}

# Database connection parameters
$dbHost = "localhost"
$dbName = "improvement_solutions"
$dbUser = "root"

Write-Host "Conectando a la base de datos $dbName en $dbHost..." -ForegroundColor Yellow

# Execute the migration script
try {
    $scriptPath = ".\migrate_to_multiple_contractor_companies.sql"
    if (-not (Test-Path $scriptPath)) {
        Write-Host "Error: No se encuentra el archivo de migración: $scriptPath" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Ejecutando script de migración..." -ForegroundColor Yellow
    Write-Host "Nota: Se solicitará la contraseña de MySQL para el usuario root" -ForegroundColor Cyan
    
    # Execute MySQL script
    & "$mysqlPath" -h $dbHost -u $dbUser -p < $scriptPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "===========================================" -ForegroundColor Green
        Write-Host "¡Migración completada exitosamente!" -ForegroundColor Green
        Write-Host "===========================================" -ForegroundColor Green
        Write-Host "Tabla business_contractor_companies creada" -ForegroundColor Green
        Write-Host "Datos existentes migrados correctamente" -ForegroundColor Green
        Write-Host "El sistema ahora soporta múltiples empresas contratistas por empresa" -ForegroundColor Green
    } else {
        Write-Host "Error ejecutando la migración. Código de salida: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error ejecutando la migración: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`nReinicie el backend de Spring Boot para aplicar los cambios." -ForegroundColor Cyan