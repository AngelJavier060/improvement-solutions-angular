import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HoraDescanso } from '../../../../../models/hora-descanso.model';
import { HoraDescansoService } from '../../../../../services/hora-descanso.service';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { MetodologiaRiesgoService } from '../../../../../services/metodologia-riesgo.service';
import { parametrosIperNpNs } from '../shared/metodologia-catalogo-niveles.util';

@Component({
  selector: 'app-nueva-hora-descanso',
  templateUrl: './nueva-hora-descanso.component.html',
  styleUrls: ['./nueva-hora-descanso.component.scss']
})
export class NuevaHoraDescansoComponent implements OnInit {
  form: FormGroup;
  loading = false;
  loadingMetodologias = true;
  error = '';
  metodologias: MetodologiaRiesgo[] = [];

  constructor(
    private fb: FormBuilder,
    private service: HoraDescansoService,
    private metodologiaService: MetodologiaRiesgoService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      metodologiaId: [null],
      neNivelId: [null],
      ndNivelId: [null],
      ncNivelId: [null]
    });
  }

  ngOnInit(): void {
    this.metodologiaService.getAll().subscribe({
      next: (items) => {
        this.metodologias = items;
        this.loadingMetodologias = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las metodologías de riesgo.';
        this.loadingMetodologias = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    const mid = Number(this.form.value.metodologiaId) || null;
    const selected =
      this.metodologias.find((item) => Number(item.id) === mid) || null;
    const iper = parametrosIperNpNs(selected);
    const entity: HoraDescanso = {
      name: this.form.value.name,
      description: this.form.value.description,
      metodologiaRiesgo: mid ? { id: mid, name: '' } : null,
      neNivel: this.nivelPayload(this.form.value.neNivelId),
      ndNivel: this.nivelPayload(this.form.value.ndNivelId),
      ncNivel: iper ? null : this.nivelPayload(this.form.value.ncNivelId)
    };
    this.service.create(entity).subscribe({
      next: () => this.router.navigate(['/dashboard/admin/configuracion/hora-descanso']),
      error: (err) => {
        this.error = err?.error?.message || 'Error al guardar. Intente nuevamente.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/admin/configuracion/hora-descanso']);
  }

  private nivelPayload(id: unknown): { id: number; valor: number; nombre: string } | null {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) {
      return null;
    }
    return { id: n, valor: 0, nombre: '' };
  }
}
