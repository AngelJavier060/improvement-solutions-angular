/**
 * Herramientas de diagnóstico para resolver problemas de enrutamiento y carga de imágenes
 */

// Función para diagnosticar problemas con rutas
export function diagnoseRouting(router: any) {
  if (!router) {
    console.error('Router no disponible');
    return;
  }

  console.group('Diagnóstico de Enrutamiento');
  console.log('Router URL actual:', router.url);
  
  // Examinar la configuración de rutas
  console.log('Configuración de rutas raíz:', router.config);
  
  // Buscar rutas específicas
  const adminRoute = router.config.find((r: any) => r.path === 'dashboard/admin');
  if (adminRoute) {
    console.log('Ruta de Admin Dashboard:', adminRoute);
    console.log('Hijos de Admin Dashboard:', adminRoute.children);
    
    const empresasRoute = adminRoute.children?.find((r: any) => r.path === 'empresas');
    if (empresasRoute) {
      console.log('Módulo de Empresas:', empresasRoute);
      
      if (empresasRoute._loadedConfig) {
        console.log('Rutas cargadas del módulo de Empresas:', empresasRoute._loadedConfig.routes);
      } else {
        console.warn('El módulo de empresas aún no ha sido cargado o está definido incorrectamente');
      }
    } else {
      console.warn('No se encontró la ruta de empresas en los hijos de dashboard/admin');
    }
  } else {
    console.warn('No se encontró la ruta de dashboard/admin');
  }
  
  console.log('Estado de la navegación:', router.navigationId);
  console.groupEnd();
}

// Función para diagnosticar problemas con la carga de logos
export function diagnoseImageLoading(fileService: any) {
  if (!fileService) {
    console.error('Servicio de archivos no disponible');
    return;
  }
  
  console.group('Diagnóstico de Carga de Imágenes');
  
  // Información de autenticación
  const token = localStorage.getItem('auth_token');
  console.log('Token disponible:', !!token);
  
  // Probar URL de ejemplo
  const testFileName = '080919a1-4e5f-4673-adbd-91c6ca76d9c2.png'; // Nombre de archivo de ejemplo
  
  const testUrl1 = fileService.getFileUrlFromDirectory('logos', testFileName);
  console.log('URL de prueba con directorio específico:', testUrl1);
  
  const testUrl2 = fileService.getFileUrl(testFileName);
  console.log('URL de prueba general:', testUrl2);
  
  const testUrl3 = fileService.getFileUrlFromDirectory('logos', testFileName, false);
  console.log('URL de prueba sin prevención de caché:', testUrl3);
  
  // Verificar si las URLs incluyen token
  console.log('Verificación de inclusión de token:');
  console.log('URL 1 tiene token:', testUrl1.includes('token='));
  console.log('URL 2 tiene token:', testUrl2.includes('token='));
  
  console.groupEnd();
  
  // Crear una imagen de prueba para verificar carga
  console.group('Prueba de Carga de Imagen');
  const img = new Image();
  img.onload = () => console.log('✅ Imagen cargada correctamente');
  img.onerror = (e) => console.error('❌ Error al cargar la imagen', e);
  img.src = testUrl1;
  console.log('Intentando cargar imagen desde:', img.src);
  console.groupEnd();
}

// Función para forzar redirección a lista de empresas
export function forceRedirectToCompanies(router: any) {
  if (!router) {
    console.error('Router no disponible');
    return;
  }
  
  console.log('Forzando redirección a lista de empresas...');
  
  // Intentar varias estrategias
  try {
    const success1 = router.navigateByUrl('/dashboard/admin/empresas/lista', { 
      replaceUrl: true 
    });
    console.log('Navegación 1:', success1);
    
    if (!success1) {
      const success2 = router.navigate(['/dashboard/admin/empresas/lista']);
      console.log('Navegación 2:', success2);
      
      if (!success2) {
        window.location.href = '/dashboard/admin/empresas/lista';
      }
    }
  } catch (error) {
    console.error('Error al navegar:', error);
    window.location.href = '/dashboard/admin/empresas/lista';
  }
}

// Agregar funciones al objeto global para pruebas
(window as any).diagnoseRouting = diagnoseRouting;
(window as any).diagnoseImageLoading = diagnoseImageLoading;
(window as any).forceRedirectToCompanies = forceRedirectToCompanies;
