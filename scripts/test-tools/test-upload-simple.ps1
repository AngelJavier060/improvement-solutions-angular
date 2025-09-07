# Definir la ruta del archivo de prueba
$testImagePath = Join-Path $PSScriptRoot "test-logo.png"

# Crear un archivo de imagen simple para pruebas
Write-Host "Creando un archivo de imagen simple para pruebas..."
$content = [System.Text.Encoding]::UTF8.GetBytes("Esta es una imagen de prueba")
Set-Content -Path $testImagePath -Value $content -Encoding Byte

# Usar Invoke-RestMethod para probar la API
Write-Host "Probando carga a /api/files/upload/logos..."

try {
    # Preparar los datos del archivo para la carga
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    $fileContent = [System.IO.File]::ReadAllBytes($testImagePath)
    
    # Construir el cuerpo de la solicitud multipart/form-data
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"test-logo.png`"",
        "Content-Type: image/png$LF",
        [System.Text.Encoding]::UTF8.GetString($fileContent),
        "--$boundary--$LF"
    ) -join $LF
    
    # Realizar la solicitud HTTP
    $result = Invoke-RestMethod -Uri "http://localhost:8080/api/files/upload/logos" -Method Post -ContentType "multipart/form-data; boundary=`"$boundary`"" -Body $bodyLines
    
    # Mostrar resultado
    Write-Host "Carga exitosa. Resultado:"
    $result | ConvertTo-Json
} catch {
    Write-Host "Error al subir el archivo:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $responseStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Respuesta de error:" -ForegroundColor Red
        Write-Host $errorContent -ForegroundColor Red
    }
} finally {
    # Eliminar el archivo de prueba
    Remove-Item -Path $testImagePath -Force -ErrorAction SilentlyContinue
}
