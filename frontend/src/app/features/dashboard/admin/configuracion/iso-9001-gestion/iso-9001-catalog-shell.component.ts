import { Component } from '@angular/core';

/** Contenedor mínimo para rutas hijas lista / nuevo / editar por catálogo ISO. */
@Component({
  selector: 'app-iso-9001-catalog-shell',
  template: '<router-outlet></router-outlet>',
  styles: [':host { display: block; }']
})
export class Iso9001CatalogShellComponent {}
