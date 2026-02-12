import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { PlanesPreciosComponent } from './planes-precios.component';

@NgModule({
  declarations: [
    PlanesPreciosComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([
      { path: '', component: PlanesPreciosComponent }
    ])
  ]
})
export class PlanesModule { }
