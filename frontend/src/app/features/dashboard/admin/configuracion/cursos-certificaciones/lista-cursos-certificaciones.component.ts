import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CourseCertificationService, CourseCertification } from '../../../../../services/course-certification.service';

@Component({
  selector: 'app-lista-cursos-certificaciones',
  templateUrl: './lista-cursos-certificaciones.component.html',
  styleUrls: ['./lista-cursos-certificaciones.component.scss']
})
export class ListaCursosCertificacionesComponent implements OnInit {
  items: CourseCertification[] = [];
  loading = false;
  error: string | null = null;

  constructor(private service: CourseCertificationService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.service.getAll().subscribe({
      next: (data) => { this.items = data || []; this.loading = false; },
      error: (err) => { this.error = 'No se pudieron cargar los cursos y certificaciones.'; this.loading = false; console.error(err); }
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar este registro?')) return;
    this.service.delete(id).subscribe({
      next: () => this.load(),
      error: (err) => { console.error(err); alert('No se pudo eliminar.'); }
    });
  }
}
