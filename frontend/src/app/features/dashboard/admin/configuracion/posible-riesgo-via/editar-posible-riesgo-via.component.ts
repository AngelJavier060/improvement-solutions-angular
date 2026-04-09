import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PosibleRiesgoViaService } from '../../../../../services/posible-riesgo-via.service';

@Component({
  selector: 'app-editar-posible-riesgo-via',
  templateUrl: './editar-posible-riesgo-via.component.html',
  styleUrls: ['../hora-conduccion/editar-hora-conduccion.component.scss']
})
export class EditarPosibleRiesgoViaComponent implements OnInit {
  form: FormGroup;
  loading = true;
  saving = false;
  error = '';
  id!: number;

  constructor(
    private fb: FormBuilder,
    private service: PosibleRiesgoViaService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(this.id).subscribe({
      next: (data) => {
        this.form.patchValue({ name: data.name, description: data.description });
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar el registro';
        this.loading = false;
        console.error(err);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.service.update(this.id, this.form.value).subscribe({
      next: () => {
        this.router.navigate(['dashboard/admin/configuracion/posible-riesgo-via']);
      },
      error: (err) => {
        this.error = 'Error al actualizar el registro';
        this.saving = false;
        console.error(err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion/posible-riesgo-via']);
  }
}
