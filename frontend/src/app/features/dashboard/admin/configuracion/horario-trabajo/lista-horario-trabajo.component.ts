import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WorkShiftService } from '../../../../../services/work-shift.service';
import { WorkShift } from '../../../../../models/work-shift.model';

@Component({
  selector: 'app-lista-horario-trabajo',
  templateUrl: './lista-horario-trabajo.component.html'
})
export class ListaHorarioTrabajoComponent implements OnInit {
  horarios: WorkShift[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private workShiftService: WorkShiftService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadHorarios();
  }

  loadHorarios(): void {
    this.loading = true;
    this.error = null;
    this.workShiftService.getAll().subscribe({
      next: (data) => {
        this.horarios = data || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al cargar los horarios de trabajo.';
        this.loading = false;
      }
    });
  }

  goToNew(): void {
    this.router.navigate(['/dashboard/admin/configuracion/horarios-trabajo/nuevo']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/dashboard/admin/configuracion/horarios-trabajo/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard/admin/configuracion']);
  }

  delete(id: number): void {
    if (!confirm('¿Está seguro de eliminar este horario de trabajo?')) return;
    this.workShiftService.delete(id).subscribe({
      next: () => {
        this.successMessage = 'Horario eliminado exitosamente.';
        this.loadHorarios();
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: () => {
        this.error = 'Error al eliminar el horario de trabajo.';
      }
    });
  }
}
