import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { EppCatalogShellComponent } from './epp-catalog-shell.component';
import { ListaEppCatalogComponent, EppCatalogRouteData } from './lista-epp-catalog.component';
import { NuevoEppCatalogComponent } from './nuevo-epp-catalog.component';
import { EditarEppCatalogComponent } from './editar-epp-catalog.component';
import { ListaInventarioProveedoresComponent } from './lista-inventario-proveedores.component';
import { NuevoInventarioProveedorComponent } from './nuevo-inventario-proveedor.component';
import { EditarInventarioProveedorComponent } from './editar-inventario-proveedor.component';

function catalogRoutes(path: string, data: EppCatalogRouteData): Routes {
  return [
    {
      path,
      component: EppCatalogShellComponent,
      data,
      children: [
        { path: '', component: ListaEppCatalogComponent },
        { path: 'nuevo', component: NuevoEppCatalogComponent },
        { path: 'editar/:id', component: EditarEppCatalogComponent }
      ]
    }
  ];
}

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'familia' },
  ...catalogRoutes('familia', {
    catalogKey: 'familia',
    listaTitulo: 'Familia',
    listaSubtitulo: 'Inventario-Bodega — catálogo de familias (nombre, código y descripción).',
    nombreItemPlural: 'familias'
  }),
  ...catalogRoutes('seccion', {
    catalogKey: 'seccion',
    listaTitulo: 'Sección',
    listaSubtitulo: 'Inventario-Bodega — catálogo de secciones (nombre, código y descripción).',
    nombreItemPlural: 'secciones'
  }),
  ...catalogRoutes('tipo-entrada', {
    catalogKey: 'tipo-entrada',
    listaTitulo: 'Tipo de Entrada',
    listaSubtitulo: 'Inventario-Bodega — registre cada motivo de ingreso con nombre y descripción. Ejemplos: Compra, Devolución, Transferencia, Ajuste, Donación.',
    nombreItemPlural: 'tipos de entrada'
  }),
  ...catalogRoutes('tipo-salida', {
    catalogKey: 'tipo-salida',
    listaTitulo: 'Tipo de Salida',
    listaSubtitulo: 'Inventario-Bodega — registre cada motivo de egreso con nombre y descripción. Ejemplos: Entrega de EPP a trabajador, Préstamo de herramienta, Baja de productos.',
    nombreItemPlural: 'tipos de salida'
  }),
  ...catalogRoutes('tipo-acontecimiento', {
    catalogKey: 'tipo-acontecimiento',
    listaTitulo: 'Tipo de Acontecimiento',
    listaSubtitulo: 'Inventario-Bodega — motivos del reporte Cambio EPP (nombre y descripción). Ejemplos: Solicitud de EPP, Incumplimiento de uso, Deterioro prematuro, Pérdida de equipo.',
    nombreItemPlural: 'tipos de acontecimiento'
  }),
  ...catalogRoutes('estado-epi', {
    catalogKey: 'estado-epi',
    listaTitulo: 'Estado del EPI',
    listaSubtitulo: 'Inventario-Bodega — estados del equipo en Cambio EPP (nombre y descripción). Ejemplos: Buen estado, Desgaste normal, Deteriorado / Roto.',
    nombreItemPlural: 'estados del EPI'
  }),
  {
    path: 'proveedores',
    component: EppCatalogShellComponent,
    children: [
      { path: '', component: ListaInventarioProveedoresComponent },
      { path: 'nuevo', component: NuevoInventarioProveedorComponent },
      { path: 'editar/:id', component: EditarInventarioProveedorComponent }
    ]
  }
];

@NgModule({
  declarations: [
    EppCatalogShellComponent,
    ListaEppCatalogComponent,
    NuevoEppCatalogComponent,
    EditarEppCatalogComponent,
    ListaInventarioProveedoresComponent,
    NuevoInventarioProveedorComponent,
    EditarInventarioProveedorComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes)
  ]
})
export class EquipoProteccionPersonalModule {}
