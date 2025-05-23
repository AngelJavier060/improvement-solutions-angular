<!-- Crear un archivo de arreglo que prueba diferentes soluciones -->
// filepath: d:\PROGRAMAS CREADOS PROBADOS 2025\improvement-solutions-angular\frontend\src\app\fix-tipo-documento-routing.ts

/**
 * Este archivo contiene soluciones para el problema de redirección del módulo de tipo-documento.
 * Una vez que identifiquemos la solución que funciona, aplicaremos los cambios permanentemente.
 */

// Solución 1: Probar navegación programática
export const testProgrammaticNavigation = () => {
  const router = window.router; // Asume que guardamos la instancia del router en window
  if (!router) {
    console.error('Router instance not available. Add router to window in AppComponent.');
    return;
  }
  
  console.log('Navegando programáticamente a /dashboard/admin/configuracion/tipo-documento');
  router.navigate(['/dashboard/admin/configuracion/tipo-documento']).then(
    success => console.log('Navegación exitosa:', success),
    error => console.error('Error en navegación:', error)
  );
};

// Solución 2: Verificar y corregir las rutas cargadas
export const inspectRoutes = () => {
  const router = window.router;
  if (!router) {
    console.error('Router instance not available');
    return;
  }
  
  console.log('Rutas configuradas:', router.config);
  
  // Buscar la ruta de configuración
  const configRoute = router.config.find(route => 
    route.path === 'dashboard/admin' && 
    route.children?.some(child => child.path === 'configuracion')
  );
  
  if (configRoute) {
    const configChildRoute = configRoute.children?.find(child => child.path === 'configuracion');
    console.log('Ruta de configuración:', configChildRoute);
    
    if (configChildRoute && configChildRoute.children) {
      const tipoDocumentoRoute = configChildRoute.children.find(child => 
        child.path === 'tipo-documento'
      );
      console.log('Ruta de tipo-documento:', tipoDocumentoRoute);
    }
  }
};

// Solución 3: Forzar carga del módulo
export const forceLoadModule = async () => {
  try {
    const module = await import('./features/dashboard/admin/configuracion/tipo-documento/tipo-documento.module');
    console.log('Módulo cargado exitosamente:', module);
  } catch (error) {
    console.error('Error al cargar el módulo:', error);
  }
};

// Ejecutar pruebas cuando se cargue el script
console.log('Script de corrección de tipo-documento cargado.');
console.log('Para ejecutar pruebas:');
console.log('1. fixTipoDocumento.testProgrammaticNavigation()');
console.log('2. fixTipoDocumento.inspectRoutes()');
console.log('3. fixTipoDocumento.forceLoadModule()');

// Exponer funciones para uso en consola
(window as any).fixTipoDocumento = {
  testProgrammaticNavigation,
  inspectRoutes,
  forceLoadModule
};
