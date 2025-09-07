# Script para probar la carga de logos
$testImagePath = "$PSScriptRoot\..\img\test-logo.png"

# Si no existe la imagen de prueba, crear una imagen simple con .NET
if (-not (Test-Path $testImagePath)) {
    Write-Host "Creando imagen de prueba..."
    Add-Type -AssemblyName System.Drawing
    $bmp = New-Object System.Drawing.Bitmap 200, 200
    $graphics = [System.Drawing.Graphics]::FromImage($bmp)
    $graphics.Clear([System.Drawing.Color]::LightBlue)
    $font = New-Object System.Drawing.Font "Arial", 16
    $brush = [System.Drawing.Brushes]::Black
    $graphics.DrawString("Test Logo", $font, $brush, 50, 80)
    $bmp.Save($testImagePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bmp.Dispose()
}

Write-Host "Subiendo imagen de prueba al servidor..."

# Realizar la carga usando Invoke-RestMethod
$url = "http://localhost:8080/api/files/upload/logos"

try {
    $fileBytes = [System.IO.File]::ReadAllBytes($testImagePath)
    $fileName = [System.IO.Path]::GetFileName($testImagePath)
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: image/png$LF",
        [System.Text.Encoding]::UTF8.GetString($fileBytes),
        "--$boundary--$LF"
    ) -join $LF

    $result = Invoke-RestMethod -Uri $url -Method Post -ContentType "multipart/form-data; boundary=`"$boundary`"" -Body $bodyLines
    Write-Host "Resultado de la carga:"
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
}
