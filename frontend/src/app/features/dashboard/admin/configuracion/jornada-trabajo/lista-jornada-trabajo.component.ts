import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WorkScheduleService } from '../../../../../services/work-schedule.service';
import { WorkSchedule } from '../../../../../models/work-schedule.model';

@Component({
  selector: 'app-lista-jornada-trabajo',
  templateUrl: './lista-jornada-trabajo.component.html'
})
export class ListaJornadaTrabajoComponent implements OnInit {
  jornadas: WorkSchedule[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private workScheduleService: WorkScheduleService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadJornadas();
  }

  loadJornadas(): void {
    this.loading = true;
    this.error = null;
    this.workScheduleService.getAll().subscribe({
      next: (data) => {
        this.jornadas = data || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las jornadas de trabajo.';
        this.loading = false;
      }
    });
  }

  goToNew(): void {
    this.router.navigate(['/dashboard/admin/configuracion/jornadas-trabajo/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/dashboard/admin/configuracion/jornadas-trabajo/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/admin/configuracion']);
  }

  delete(id: number): void {
    if (!confirm('¿Está seguro de eliminar esta jornada de trabajo?')) return;
    this.workScheduleService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Jornada eliminada exitosamente.';
        this.loadJornadas();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: () => {
        this.error = 'Error al eliminar la jornada de trabajo.';
      }
    });
  }
}
