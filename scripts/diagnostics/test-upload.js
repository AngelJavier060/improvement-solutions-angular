/**
 * Script para probar la carga de archivos al endpoint de logos
 */

// URL del servicio backend
const API_URL = 'http://localhost:8081/api/files/upload/logos';

// Token JWT para autorización (reemplaza esto con un token válido)
const AUTH_TOKEN = 'Bearer tu_token_jwt_aquí';

/**
 * Función para crear una imagen pequeña para pruebas
 * @returns {File} Un archivo de imagen para pruebas
 */
function createTestImage() {
  // Crear un canvas
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  
  // Dibujar algo simple
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3498db';
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = '#ffffff';
  ctx.font = '30px Arial';
  ctx.fillText('Test Logo', 30, 100);
  
  // Convertir a blob
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      const file = new File([blob], 'test-logo.png', { type: 'image/png' });
      resolve(file);
    }, 'image/png');
  });
}

/**
 * Función principal para probar la carga de archivos
 */
async function testUpload() {
  console.log('Iniciando prueba de carga de archivos...');
  
  try {
    // Crear imagen de prueba
    const testFile = await createTestImage();
    console.log('Imagen de prueba creada:', testFile);
    
    // Crear FormData y añadir el archivo
    const formData = new FormData();
    formData.append('file', testFile);
    
    // Opciones para la solicitud fetch
    const options = {
      method: 'POST',
      headers: {
        'Authorization': AUTH_TOKEN
      },
      body: formData,
      // Importante para CORS
      credentials: 'include'
    };
    
    // Realizar solicitud preflight OPTIONS para verificar CORS
    console.log('Realizando solicitud OPTIONS para verificar CORS...');
    const preflightResponse = await fetch(API_URL, { 
      method: 'OPTIONS',
      headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization,Content-Type'
      }
    });
    
    console.log('Respuesta preflight (OPTIONS):', preflightResponse);
    console.log('Cabeceras de la respuesta preflight:');
    for (const [key, value] of preflightResponse.headers.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    // Si el preflight fue exitoso, realizar la carga de archivo
    if (preflightResponse.ok) {
      console.log('Realizando solicitud POST para cargar el archivo...');
      const uploadResponse = await fetch(API_URL, options);
      
      console.log('Respuesta de carga:', uploadResponse);
      console.log('Cabeceras de la respuesta:');
      for (const [key, value] of uploadResponse.headers.entries()) {
        console.log(`${key}: ${value}`);
      }
      
      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        console.log('Archivo cargado exitosamente:', result);
      } else {
        const error = await uploadResponse.text();
        console.error('Error al cargar archivo:', error);
      }
    } else {
      console.error('Falló la verificación CORS (preflight). No se intentará cargar el archivo.');
    }
  } catch (error) {
    console.error('Error durante la prueba de carga:', error);
  }
}

// Ejecutar la prueba cuando el documento esté listo
if (document.readyState === 'complete') {
  testUpload();
} else {
  document.addEventListener('DOMContentLoaded', testUpload);
}
