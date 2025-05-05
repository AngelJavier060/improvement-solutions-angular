import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-usuario',
  templateUrl: './dashboard-usuario.component.html',
  styleUrls: ['./dashboard-usuario.component.scss']
})
export class DashboardUsuarioComponent implements OnInit {
  username: string = 'Javier'; // Valor por defecto

  constructor(private router: Router, private authService: AuthService) { }

  ngOnInit(): void {
    // Obtener información del usuario actual
    const user = this.authService.getCurrentUser();
    if (user) {
      this.username = user.name || user.username || 'Javier';
    }
  }

  logout(): void {
    this.authService.logout();
  }
}