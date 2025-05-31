# Script para probar la carga de archivos (compatible con PowerShell)
# Guarda este archivo como test-upload.ps1 y ejecútalo con PowerShell

# Parámetros de configuración
$apiUrl = "http://localhost:8080/api/files/upload/logos"
$imagePath = "test-logo.png"

# Crear una imagen de prueba si no existe
if (-not (Test-Path $imagePath)) {
    Write-Host "Creando imagen de prueba..."
    
    # Este es un script que crea una imagen PNG simple para pruebas
    # Requiere que tengas instalado el módulo System.Drawing
    try {
        Add-Type -AssemblyName System.Drawing
        
        # Crear un bitmap
        $width = 200
        $height = 200
        $bitmap = New-Object System.Drawing.Bitmap $width,$height
        
        # Crear un objeto Graphics para dibujar
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        
        # Rellenar el fondo con azul
        $graphics.FillRectangle([System.Drawing.Brushes]::Blue, 0, 0, $width, $height)
        
        # Añadir texto
        $font = New-Object System.Drawing.Font("Arial", 20)
        $brush = [System.Drawing.Brushes]::White
        $graphics.DrawString("Test Logo", $font, $brush, 20, 80)
        
        # Guardar la imagen
        $bitmap.Save($imagePath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Limpiar recursos
        $graphics.Dispose()
        $bitmap.Dispose()
        
        Write-Host "Imagen de prueba creada: $imagePath"
    }
    catch {
        Write-Host "No se pudo crear la imagen de prueba automáticamente."
        Write-Host "Por favor, crea manualmente una imagen para la prueba."
        exit
    }
}

# Función para realizar una solicitud OPTIONS para verificar CORS
function Test-CorsOptions {
    Write-Host "`n===== PRUEBA DE SOLICITUD PREFLIGHT OPTIONS ====="
    Write-Host "URL: $apiUrl"
    
    try {
        $headersOptions = @{
            "Origin" = "http://localhost:4200"
            "Access-Control-Request-Method" = "POST"
            "Access-Control-Request-Headers" = "Origin, Content-Type, Authorization"
        }
        
        $response = Invoke-WebRequest -Uri $apiUrl -Method OPTIONS -Headers $headersOptions -ErrorAction Stop
        
        Write-Host "Solicitud OPTIONS exitosa (Status: $($response.StatusCode))"
        Write-Host "`nCabeceras de respuesta CORS:"
        
        $corsHeaders = @(
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Methods", 
            "Access-Control-Allow-Headers",
            "Access-Control-Allow-Credentials",
            "Access-Control-Max-Age"
        )
        
        foreach ($header in $corsHeaders) {
            if ($response.Headers.ContainsKey($header)) {
                Write-Host "$header : $($response.Headers[$header])"
            } else {
                Write-Host "$header : (no presente)"
            }
        }
        
        return $true
    }
    catch {
        Write-Host "Error en la solicitud OPTIONS: $_"
        return $false
    }
}

# Función para realizar la carga del archivo
function Upload-File {
    Write-Host "`n===== PRUEBA DE CARGA DE ARCHIVOS ====="
    Write-Host "URL: $apiUrl"
    Write-Host "Archivo: $imagePath"
    
    try {
        # Verificar que el archivo existe
        if (-not (Test-Path $imagePath)) {
            Write-Host "El archivo $imagePath no existe!"
            return
        }
        
        # Crear solicitud multipart/form-data
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"file`"; filename=`"test-logo.png`"",
            "Content-Type: image/png",
            "",
            [System.IO.File]::ReadAllText($imagePath),
            "--$boundary--",
            ""
        )
        
        $body = $bodyLines -join $LF
        
        $headers = @{
            "Content-Type" = "multipart/form-data; boundary=$boundary"
            "Origin" = "http://localhost:4200"
        }
        
        # Añadir token JWT si está disponible (descomenta esto si tienes un token)
        # $headers["Authorization"] = "Bearer tu_token_jwt_aquí"
        
        Write-Host "Enviando solicitud..."
        $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $body -ErrorAction Stop
        
        Write-Host "¡Archivo cargado exitosamente!"
        Write-Host "Respuesta del servidor:"
        $response | ConvertTo-Json -Depth 4
    }
    catch {
        Write-Host "Error al cargar el archivo: $_"
        if ($_.Exception.Response) {
            $responseBody = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($responseBody)
            $responseContent = $reader.ReadToEnd()
            Write-Host "Contenido de la respuesta de error:"
            Write-Host $responseContent
        }
    }
}

# Ejecutar las pruebas
Write-Host "=== INICIO DE PRUEBA DE CORS Y CARGA DE ARCHIVOS ==="

# Probar OPTIONS primero
$optionsSuccess = Test-CorsOptions

# Si OPTIONS es exitoso, intentar la carga
if ($optionsSuccess) {
    Upload-File
}

Write-Host "`n=== FIN DE LA PRUEBA ==="
