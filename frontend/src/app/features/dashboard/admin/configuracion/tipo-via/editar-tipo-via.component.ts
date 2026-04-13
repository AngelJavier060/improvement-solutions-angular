import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TipoVia } from '../../../../../models/tipo-via.model';
import { TipoViaService } from '../../../../../services/tipo-via.service';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { MetodologiaRiesgoService } from '../../../../../services/metodologia-riesgo.service';
import { parametrosIperNpNs } from '../shared/metodologia-catalogo-niveles.util';

@Component({
  selector: 'app-editar-tipo-via',
  templateUrl: './editar-tipo-via.component.html',
  styleUrls: ['./editar-tipo-via.component.scss']
})
export class EditarTipoViaComponent implements OnInit {
  form: FormGroup;
  loading = true;
  saving = false;
  error = '';
  id!: number;
  metodologias: MetodologiaRiesgo[] = [];

  constructor(
    private fb: FormBuilder,
    private service: TipoViaService,
    private metodologiaService: MetodologiaRiesgoService,
    private router: Router,
    private route: ActivatedRoute
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
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadData();
  }

  loadData(): void {
    forkJoin({
      metodologias: this.metodologiaService.getAll(),
      item: this.service.getById(this.id)
    }).subscribe({
      next: ({ metodologias, item }) => {
        this.metodologias = metodologias;
        this.form.patchValue({
          name: item.name,
          description: item.description,
          metodologiaId: item.metodologiaRiesgo?.id ?? null,
          neNivelId: item.neNivel?.id ?? null,
          ndNivelId: item.ndNivel?.id ?? null,
          ncNivelId: item.ncNivel?.id ?? null
        });
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al cargar el registro';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    const mid = Number(this.form.value.metodologiaId) || null;
    const selected =
      this.metodologias.find((item) => Number(item.id) === mid) || null;
    const iper = parametrosIperNpNs(selected);
    const entity: TipoVia = {
      name: this.form.value.name,
      description: this.form.value.description,
      metodologiaRiesgo: mid ? { id: mid, name: '' } : null,
      neNivel: this.nivelPayload(this.form.value.neNivelId),
      ndNivel: this.nivelPayload(this.form.value.ndNivelId),
      ncNivel: iper ? null : this.nivelPayload(this.form.value.ncNivelId)
    };
    this.service.update(this.id, entity).subscribe({
      next: () => this.router.navigate(['/dashboard/admin/configuracion/tipo-via']),
      error: (err) => {
        this.error = err?.error?.message || 'Error al actualizar. Intente nuevamente.';
        this.saving = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard/admin/configuracion/tipo-via']);
  }

  private nivelPayload(id: unknown): { id: number; valor: number; nombre: string } | null {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) {
      return null;
    }
    return { id: n, valor: 0, nombre: '' };
  }
}
