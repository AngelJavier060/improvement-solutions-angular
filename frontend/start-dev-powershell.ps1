# Script de inicio para el desarrollo del frontend
Write-Host "Iniciando servidor de desarrollo Angular..." -ForegroundColor Green

# Verificar si existe node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Iniciar el servidor de desarrollo
npm start
