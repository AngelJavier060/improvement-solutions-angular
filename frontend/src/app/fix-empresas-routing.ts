/**
 * Este script de diagnóstico ayuda a identificar y resolver problemas de enrutamiento
 * específicamente para el módulo de empresas.
 */

// Función para diagnosticar problemas con el enrutamiento de empresas
export function diagnoseEmpresasRouting() {
  try {
    // Obtener el router desde la aplicación Angular
    const router = (window as any).router;
    if (!router) {
      console.error('No se encontró la instancia del router. Agregue esta línea en el AppComponent: (window as any).router = this.router;');
      return;
    }

    console.group('Diagnóstico de enrutamiento del módulo Empresas');
    
    // Imprimir la URL actual
    console.log('URL actual:', router.url);
    
    // Buscar la ruta para el dashboard de administración
    const adminRoute = router.config.find((route: any) => route.path === 'dashboard/admin');
    console.log('Ruta de admin dashboard:', adminRoute);
    
    if (adminRoute && adminRoute.children) {
      // Buscar la ruta de empresas
      const empresasRoute = adminRoute.children.find((route: any) => route.path === 'empresas');
      console.log('Ruta de empresas:', empresasRoute);
      
      if (empresasRoute && empresasRoute._loadedConfig && empresasRoute._loadedConfig.routes) {
        console.log('Rutas cargadas de empresas:', empresasRoute._loadedConfig.routes);
        
        // Verificar la ruta de lista
        const listaRoute = empresasRoute._loadedConfig.routes.find((route: any) => route.path === 'lista');
        console.log('Ruta de lista de empresas:', listaRoute);
        
        // Verificar la ruta de nuevo
        const nuevoRoute = empresasRoute._loadedConfig.routes.find((route: any) => route.path === 'nuevo');
        console.log('Ruta de nueva empresa:', nuevoRoute);
      } else {
        console.warn('La ruta de empresas existe pero no tiene _loadedConfig (puede que aún no se haya cargado)');
      }
    } else {
      console.warn('La ruta de dashboard/admin no tiene hijos');
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('Error al diagnosticar rutas de empresas:', error);
  }
}

// Función para forzar la navegación a la lista de empresas
export function forceNavigateToEmpresasList() {
  try {
    const router = (window as any).router;
    if (!router) {
      console.error('No se encontró la instancia del router');
      return;
    }
    
    console.log('Forzando navegación a la lista de empresas...');
      // Intentar varias estrategias de navegación
    router.navigateByUrl('/dashboard/admin/empresas/lista', { 
      replaceUrl: true,
      skipLocationChange: false
    }).then((success: boolean) => {
      console.log('Navegación a través de URL:', success ? 'exitosa' : 'fallida');
    });
  } catch (error) {
    console.error('Error al navegar:', error);
  }
}

// Función para registrar el componente actual
export function registerCurrentComponent() {
  console.log('Componente actual:', window.document.querySelector('app-root router-outlet + *'));
}

// Agregar estas funciones al objeto window para llamarlas desde la consola
(window as any).diagnoseEmpresasRouting = diagnoseEmpresasRouting;
(window as any).forceNavigateToEmpresasList = forceNavigateToEmpresasList;
(window as any).registerCurrentComponent = registerCurrentComponent;
