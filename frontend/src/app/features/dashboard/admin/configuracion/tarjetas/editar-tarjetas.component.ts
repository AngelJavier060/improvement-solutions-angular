import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CardService } from '../../../../../services/card.service';

@Component({
  selector: 'app-editar-tarjetas',
  templateUrl: './editar-tarjetas.component.html',
  styleUrls: ['./editar-tarjetas.component.scss']
})
export class EditarTarjetasComponent implements OnInit {
  form: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;
  successMessage: string | null = null;
  id!: number;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private service: CardService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(255)]]
    });
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    if (this.id) {
      this.load();
    }
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.service.getById(this.id).subscribe({
      next: (it) => {
        this.form.patchValue({ name: it.name, description: it.description || '' });
        this.loading = false;
      },
      error: (err) => {
        this.error = 'No se pudo cargar la tarjeta';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.error = null;
    this.service.update(this.id, this.form.value).subscribe({
      next: (resp) => {
        this.successMessage = `Tarjeta actualizada correctamente`;
        this.submitting = false;
        setTimeout(() => this.volverALista(), 1000);
      },
      error: (err) => {
        this.error = err?.status === 409 ? 'Ya existe una tarjeta con ese nombre' : 'No se pudo actualizar la tarjeta';
        this.submitting = false;
      }
    });
  }

  volverALista(): void {
    this.router.navigate(['/dashboard/admin/configuracion/tarjetas']);
  }
}
