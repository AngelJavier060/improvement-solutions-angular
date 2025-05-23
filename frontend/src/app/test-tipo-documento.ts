import { TipoDocumentoService } from './services/tipo-documento.service';

// Este archivo es solo para hacer pruebas en la consola

// Simula una llamada al servicio
const testService = () => {
  const service = new TipoDocumentoService(null);
  console.log('URL del servicio:', service['apiUrl']);
  console.log('Intentando hacer una solicitud...');
  
  // No podemos realmente ejecutar esto sin Angular, pero al menos verificamos la URL
}

// Ejecuta el test
testService();
