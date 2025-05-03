import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-usuario',
  templateUrl: './dashboard-usuario.component.html',
  styleUrls: ['./dashboard-usuario.component.scss']
})
export class DashboardUsuarioComponent implements OnInit {

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  logout(): void {
    // Aquí podrías implementar cualquier lógica de limpieza de sesión
    // Por ahora simplemente redirigimos a la página principal
    this.router.navigate(['/']);
  }
}