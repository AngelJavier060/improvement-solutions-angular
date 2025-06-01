import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ListaMatrizLegalComponent } from './lista-matriz-legal.component';
import { NuevaMatrizLegalComponent } from './nueva-matriz-legal.component';
import { EditarMatrizLegalComponent } from './editar-matriz-legal.component';
import { MatrizLegalRoutingModule } from './matriz-legal-routing.module';

@NgModule({
  declarations: [
    ListaMatrizLegalComponent,
    NuevaMatrizLegalComponent,
    EditarMatrizLegalComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatrizLegalRoutingModule,
    MatDialogModule,
    MatButtonModule
  ],
})
export class MatrizLegalModule {}