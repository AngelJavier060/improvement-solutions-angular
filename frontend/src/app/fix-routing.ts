
/**
 * Este script de diagnóstico ayuda a identificar y resolver problemas de enrutamiento
 * en la aplicación Angular
 */

// Función para explorar la configuración de rutas
export function exploreRoutes() {
  try {
    // Obtener el router desde la aplicación Angular
    const router = (window as any).router;
    if (!router) {
      console.error('No se encontró la instancia del router. Agregue esta línea en el AppComponent: (window as any).router = this.router;');
      return;
    }

    console.group('Exploración de rutas');
    
    // Imprimir la configuración completa
    console.log('Configuración completa de rutas:', router.config);
    
    // Buscar la ruta para el dashboard de administración
    const adminRoute = router.config.find((route: any) => route.path === 'dashboard/admin');
    console.log('Ruta de admin dashboard:', adminRoute);
    
    if (adminRoute && adminRoute.children) {
      // Buscar la ruta de configuración
      const configRoute = adminRoute.children.find((route: any) => route.path === 'configuracion');
      console.log('Ruta de configuración:', configRoute);
      
      if (configRoute && configRoute._loadedConfig && configRoute._loadedConfig.routes) {
        console.log('Rutas cargadas de configuración:', configRoute._loadedConfig.routes);
        
        const configModuleRoutes = configRoute._loadedConfig.routes;
        // Buscar si hay hijos en las rutas de configuración
        const configMainRoute = configModuleRoutes[0];
        if (configMainRoute && configMainRoute.children) {
          console.log('Rutas hijas de configuración:', configMainRoute.children);
          
          // Buscar la ruta de tipo-documento
          const tipoDocumentoRoute = configMainRoute.children.find((route: any) => route.path === 'tipo-documento');
          console.log('Ruta de tipo-documento:', tipoDocumentoRoute);
          
          if (tipoDocumentoRoute && tipoDocumentoRoute._loadedConfig) {
            console.log('Módulo de tipo-documento cargado:', tipoDocumentoRoute._loadedConfig.routes);
          } else {
            console.warn('La ruta tipo-documento existe pero el módulo no está cargado aún');
          }
        } else {
          console.warn('La ruta de configuración no tiene hijos definidos correctamente');
        }
      } else {
        console.warn('La ruta de configuración existe pero no tiene _loadedConfig');
      }
    } else {
      console.warn('La ruta de dashboard/admin no tiene hijos');
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('Error al explorar rutas:', error);
  }
}

// Función para diagnosticar problemas comunes de enrutamiento
export function diagnoseRoutingIssues() {
  try {
    console.group('Diagnóstico de problemas de enrutamiento');
    
    // Verificar Router Outlet
    console.log('Verificando router-outlets...');
    const allOutlets = document.querySelectorAll('router-outlet');
    console.log(`Se encontraron ${allOutlets.length} router-outlets en el DOM`);
    
    // Verificar estado actual del router
    const router = (window as any).router;
    if (router) {
      console.log('URL actual:', router.url);
      console.log('Estado de navegación actual:', router.getCurrentNavigation());
      console.log('Evento de navegación más reciente:', router.lastSuccessfulNavigation);
    }
    
    // Verificar AuthGuard
    console.log('Verificando estado de autenticación...');
    const authService = (window as any).authService;
    if (authService) {
      console.log('¿Usuario autenticado?', authService.isLoggedIn());
      console.log('Roles del usuario:', authService.getUserRoles());
      console.log('Token JWT:', authService.getToken()?.substring(0, 20) + '...');
    } else {
      console.warn('No se puede acceder al AuthService');
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('Error al diagnosticar problemas de enrutamiento:', error);
  }
}

// Función para intentar navegar manualmente a tipo-documento
export function navigateToTipoDocumento() {
  try {
    const router = (window as any).router;
    if (!router) {
      console.error('Router no disponible');
      return;
    }
    
    console.log('Intentando navegación programática a tipo-documento...');
    
    // Probar diferentes formas de navegación
    Promise.all([
      router.navigate(['/dashboard/admin/configuracion/tipo-documento']).then(
        (result: boolean) => console.log('Resultado de navegación (ruta absoluta):', result)
      ),
      
      router.navigateByUrl('/dashboard/admin/configuracion/tipo-documento').then(
        (result: boolean) => console.log('Resultado de navigateByUrl:', result)
      )
    ]).then(() => {
      console.log('Ubicación actual después de intentos de navegación:', window.location.href);
    });
    
  } catch (error) {
    console.error('Error al navegar:', error);
  }
}

// Exponer en el objeto global para uso en consola
(window as any).fixRouting = {
  exploreRoutes,
  diagnoseRoutingIssues,
  navigateToTipoDocumento
};

console.log('Script de diagnóstico de enrutamiento cargado.');
console.log('Ejecute fixRouting.exploreRoutes() para explorar las rutas configuradas');
console.log('Ejecute fixRouting.diagnoseRoutingIssues() para diagnosticar problemas comunes');
console.log('Ejecute fixRouting.navigateToTipoDocumento() para intentar navegar a tipo-documento');
