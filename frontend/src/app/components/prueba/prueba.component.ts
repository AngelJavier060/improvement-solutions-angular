import { Component, OnInit } from '@angular/core';
import { PruebaService } from '../../services/prueba.service';

@Component({
  selector: 'app-prueba',
  template: `
    <div>
      <h2>Componente de Prueba</h2>
      <p *ngIf="mensaje">Mensaje del servidor: {{ mensaje }}</p>
      <p *ngIf="error">Error: {{ error }}</p>
      <button (click)="probarConexion()">Probar Conexión</button>
    </div>
  `,
  styles: []
})
export class PruebaComponent implements OnInit {
  mensaje: string = '';
  error: string = '';

  constructor(private pruebaService: PruebaService) { }

  ngOnInit(): void {
    this.probarConexion();
  }

  probarConexion(): void {
    this.pruebaService.getPrueba().subscribe({
      next: (response) => {
        this.mensaje = response.mensaje;
        this.error = '';
        console.log('Respuesta del servidor:', response);
      },
      error: (err) => {
        this.error = 'Error al conectar con el servidor: ' + JSON.stringify(err);
        console.error('Error:', err);
      }
    });
  }
}