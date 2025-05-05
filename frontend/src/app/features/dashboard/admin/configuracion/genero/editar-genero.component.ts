import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GeneroService } from '../../../../../services/genero.service';
import { Genero } from '../../../../../models/genero.model';

@Component({
  selector: 'app-editar-genero',
  templateUrl: './editar-genero.component.html',
  styleUrls: ['./editar-genero.component.scss']
})
export class EditarGeneroComponent implements OnInit {
  generoForm: FormGroup;
  id: number;
  submitting = false;
  loading = true;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private generoService: GeneroService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.id = +this.route.snapshot.params['id'];
    this.generoForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {
    this.cargarGenero();
  }

  cargarGenero(): void {
    this.loading = true;
    this.error = null;
    
    this.generoService.getGenero(this.id).subscribe({
      next: (genero: Genero) => {
        this.generoForm.patchValue({
          name: genero.name,
          description: genero.description
        });
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar género', err);
        this.error = 'No se pudo cargar el género. Por favor intente nuevamente.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.generoForm.invalid) {
      this.generoForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;

    const generoActualizado: Genero = {
      ...this.generoForm.value
    };

    this.generoService.updateGenero(this.id, generoActualizado).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/dashboard/admin/configuracion/genero']);
      },
      error: (err: any) => {
        console.error('Error al actualizar género', err);
        this.error = 'No se pudo actualizar el género. Por favor intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/genero']);
  }
}