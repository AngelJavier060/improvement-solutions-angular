import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { Iso9001CatalogShellComponent } from './iso-9001-catalog-shell.component';
import { ListaIso9001CatalogComponent, Iso9001CatalogRouteData } from './lista-iso-9001-catalog.component';
import { NuevoIso9001CatalogComponent } from './nuevo-iso-9001-catalog.component';
import { EditarIso9001CatalogComponent } from './editar-iso-9001-catalog.component';

function catalogRoutes(path: string, data: Iso9001CatalogRouteData): Routes {
  return [
    {
      path,
      component: Iso9001CatalogShellComponent,
      data,
      children: [
        { path: '', component: ListaIso9001CatalogComponent },
        { path: 'nuevo', component: NuevoIso9001CatalogComponent },
        { path: 'editar/:id', component: EditarIso9001CatalogComponent }
      ]
    }
  ];
}

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tipo-documento' },
  ...catalogRoutes('tipo-documento', {
    catalogKey: 'tipo-documento',
    listaTitulo: 'Tipo de Documento',
    listaSubtitulo: 'Sistema de Gestión ISO 9001-2018 — catálogo de tipos de documento.',
    nombreItemPlural: 'tipos de documento'
  }),
  ...catalogRoutes('proceso', {
    catalogKey: 'proceso',
    listaTitulo: 'Proceso',
    listaSubtitulo: 'Sistema de Gestión ISO 9001-2018 — catálogo de procesos.',
    nombreItemPlural: 'procesos'
  }),
  ...catalogRoutes('codigo', {
    catalogKey: 'codigo',
    listaTitulo: 'Código',
    listaSubtitulo: 'Sistema de Gestión ISO 9001-2018 — catálogo de códigos.',
    nombreItemPlural: 'códigos'
  }),
  ...catalogRoutes('almacenamiento', {
    catalogKey: 'almacenamiento',
    listaTitulo: 'Almacenamiento',
    listaSubtitulo: 'Sistema de Gestión ISO 9001-2018 — catálogo de almacenamiento.',
    nombreItemPlural: 'registros de almacenamiento'
  }),
  ...catalogRoutes('disposicion-final', {
    catalogKey: 'disposicion-final',
    listaTitulo: 'Disposición final',
    listaSubtitulo: 'Sistema de Gestión ISO 9001-2018 — catálogo de disposición final.',
    nombreItemPlural: 'registros de disposición final'
  })
];

@NgModule({
  declarations: [
    Iso9001CatalogShellComponent,
    ListaIso9001CatalogComponent,
    NuevoIso9001CatalogComponent,
    EditarIso9001CatalogComponent
  ],
  imports: [CommonModule, ReactiveFormsModule, RouterModule.forChild(routes)]
})
export class Iso9001GestionModule {}
