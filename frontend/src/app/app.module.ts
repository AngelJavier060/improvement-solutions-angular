import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { HomeComponent } from './features/home/home.component';
import { DashboardAdminComponent } from './features/dashboard/admin/dashboard-admin.component';
import { SharedModule } from './shared/shared.module';
// import { ApiUrlInterceptor } from './core/interceptors/api-url.interceptor'; // Temporalmente deshabilitado
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { AuthGuard } from './core/guards/auth.guard';
import { FileService } from './services/file.service';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DashboardAdminComponent
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgbDropdownModule,
    NgbModalModule,
    SharedModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent },

      {
        path: 'public/qr/:ruc',
        loadComponent: () => import('./pages/public/qr-legal-docs/qr-legal-docs.component').then(m => m.QrLegalDocsComponent)
      },
      
      // Nueva ruta para login de usuarios empresariales
      {
        path: 'auth/usuario-login',
        loadComponent: () => {
          console.log('[AppModule] Iniciando carga lazy del UsuarioLoginComponent');
          return import('./features/auth/usuario-login/usuario-login.component').then(m => {
            console.log('[AppModule] UsuarioLoginComponent cargado exitosamente');
            return m.UsuarioLoginComponent;
          });
        }
      },

      // Ruta puente para aceptar token como segmento de ruta y redirigir a query param
      {
        path: 'auth/reset-password/:token',
        loadComponent: () => import('./features/auth/reset-password/reset-password-redirect.component').then(m => m.ResetPasswordRedirectComponent)
      },
      
      // Nueva ruta para bienvenida de usuarios
      {
        path: 'usuario/:ruc/welcome',
        loadComponent: () => import('./features/usuario/usuario-welcome/usuario-welcome.component').then(m => m.UsuarioWelcomeComponent)
      },
      // Ruta para Inventario con menú lateral y sub-rutas
      {
        path: 'usuario/:ruc/inventario',
        loadComponent: () => import('./features/usuario/inventario/inventario-layout.component').then(m => m.InventarioLayoutComponent),
        canActivate: [AuthGuard],
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          { path: 'dashboard', loadComponent: () => import('./features/usuario/inventario/pages/dashboard/inventario-dashboard.component').then(m => m.InventarioDashboardComponent) },
          // INVENTARIO
          { path: 'catalogo-productos', loadComponent: () => import('./features/usuario/inventario/pages/catalogo-productos/catalogo-productos.component').then(m => m.CatalogoProductosComponent) },
          { path: 'stock-actual', loadComponent: () => import('./features/usuario/inventario/pages/stock-actual/stock-actual.component').then(m => m.StockActualComponent) },
          { path: 'buscar-producto', loadComponent: () => import('./features/usuario/inventario/pages/buscar-producto/buscar-producto.component').then(m => m.BuscarProductoComponent) },
          // ENTRADAS
          { path: 'nueva-entrada', loadComponent: () => import('./features/usuario/inventario/pages/nueva-entrada/nueva-entrada.component').then(m => m.NuevaEntradaComponent) },
          { path: 'historial-entradas', loadComponent: () => import('./features/usuario/inventario/pages/historial-entradas/historial-entradas.component').then(m => m.HistorialEntradasComponent) },
          // SALIDAS
          { path: 'nueva-salida', loadComponent: () => import('./features/usuario/inventario/pages/nueva-salida/nueva-salida.component').then(m => m.NuevaSalidaComponent) },
          { path: 'historial-salidas', loadComponent: () => import('./features/usuario/inventario/pages/historial-salidas/historial-salidas.component').then(m => m.HistorialSalidasComponent) },
          // GESTIÓN ESPECIAL
          { path: 'cambios-reemplazos', loadComponent: () => import('./features/usuario/inventario/pages/gestion-especial/cambios-reemplazos.component').then(m => m.CambiosReemplazosComponent) },
          { path: 'devoluciones', loadComponent: () => import('./features/usuario/inventario/pages/gestion-especial/devoluciones.component').then(m => m.DevolucionesComponent) },
          { path: 'prestamos', loadComponent: () => import('./features/usuario/inventario/pages/gestion-especial/prestamos.component').then(m => m.PrestamosComponent) },
          { path: 'ajustes', loadComponent: () => import('./features/usuario/inventario/pages/gestion-especial/ajustes.component').then(m => m.AjustesComponent) },
          { path: 'traslados', loadComponent: () => import('./features/usuario/inventario/pages/gestion-especial/traslados.component').then(m => m.TrasladosComponent) },
          // REPORTES
          { path: 'reportes-general', loadComponent: () => import('./features/usuario/inventario/pages/reportes/reportes-general.component').then(m => m.ReportesGeneralComponent) },
          { path: 'reportes-kardex', loadComponent: () => import('./features/usuario/inventario/pages/reportes/reportes-kardex.component').then(m => m.ReportesKardexComponent) },
          { path: 'asignaciones-persona', loadComponent: () => import('./features/usuario/inventario/pages/reportes/asignaciones-persona.component').then(m => m.AsignacionesPersonaComponent) },
          { path: 'reportes-alertas', loadComponent: () => import('./features/usuario/inventario/pages/reportes/reportes-alertas.component').then(m => m.ReportesAlertasComponent) },
          { path: 'reportes-financiero', loadComponent: () => import('./features/usuario/inventario/pages/reportes/reportes-financiero.component').then(m => m.ReportesFinancieroComponent) }
        ]
      },
      {
        path: 'usuario/:ruc/talento-humano',
        loadChildren: () => import('./features/dashboard/usuario/talento-humano/talento-humano.module').then(m => m.TalentoHumanoModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'usuario/:ruc/seguridad-industrial',
        loadChildren: () => import('./features/dashboard/usuario/seguridad-industrial/seguridad-industrial.module').then(m => m.SeguridadIndustrialModule),
        canActivate: [AuthGuard]
      },
      
      // Rutas del dashboard por RUC (para admin)
      {
        path: ':ruc/dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
        canActivate: [AuthGuard],
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/landing/landing-page.component').then(m => m.LandingPageComponent)
          }
        ]
      },
      
      // Rutas específicas de servicios por RUC
      {
        path: ':ruc/empleados',
        loadComponent: () => import('./pages/dashboard/empleados/empleados.component').then(m => m.EmpleadosComponent),
        canActivate: [AuthGuard]
      },
      
      // Rutas existentes del admin
      {
        path: 'dashboard/admin', 
        component: DashboardAdminComponent,
        canActivate: [AuthGuard],
        data: { role: 'ROLE_ADMIN' },
        children: [
          {
            path: 'configuracion',
            loadChildren: () => import('./features/dashboard/admin/configuracion/configuracion.module').then(m => m.ConfiguracionModule)
          },
          {
            path: 'empresas',
            loadChildren: () => import('./features/dashboard/admin/empresas/empresas.module').then(m => m.EmpresasModule)
          },
          {
            path: 'usuarios',
            loadChildren: () => import('./features/dashboard/admin/usuarios/usuarios.module').then(m => m.UsuariosModule)
          }
        ]
      },
      {
        path: 'business',
        loadChildren: () => import('./features/business/business.module').then(m => m.BusinessModule),
        canActivate: [AuthGuard]
      },
      {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
      },
      { path: '**', redirectTo: '' }
    ])
  ],
  providers: [
    FileService,
    // { provide: HTTP_INTERCEPTORS, useClass: ApiUrlInterceptor, multi: true }, // Temporalmente deshabilitado para usar proxy
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }