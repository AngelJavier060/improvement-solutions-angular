import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-talento-humano',
  templateUrl: './talento-humano.component.html',
  styleUrls: ['./talento-humano.component.scss']
})
export class TalentoHumanoComponent implements OnInit {
  isCollapsed = false;

  constructor() { }

  logout(): void {
    // Aquí puedes agregar la lógica real de logout si tienes AuthService
    // Por ahora redirige al login o welcome
    window.location.href = '/usuario';
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  ngOnInit(): void {
    console.log('Módulo de Talento Humano inicializado');
  }
}