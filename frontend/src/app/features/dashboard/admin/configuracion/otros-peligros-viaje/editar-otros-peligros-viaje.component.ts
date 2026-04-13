import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OtrosPeligrosViajeService } from '../../../../../services/otros-peligros-viaje.service';

@Component({
  selector: 'app-editar-otros-peligros-viaje',
  templateUrl: './editar-otros-peligros-viaje.component.html',
  styleUrls: ['./editar-otros-peligros-viaje.component.scss']
})
export class EditarOtrosPeligrosViajeComponent implements OnInit {
  form: FormGroup;
  loading = true;
  saving = false;
  error = '';
  id!: number;

  constructor(
    private fb: FormBuilder,
    private service: OtrosPeligrosViajeService,
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
      error: () => {
        this.error = 'Error al cargar el registro';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.service.update(this.id, this.form.value).subscribe({
      next: () => void this.router.navigate(['/dashboard/admin/configuracion/otros-peligros-viaje']),
      error: () => {
        this.error = 'Error al actualizar el registro';
        this.saving = false;
      }
    });
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/admin/configuracion/otros-peligros-viaje']);
  }
}
