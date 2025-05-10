import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EtniaService } from '../../../../../services/etnia.service';
import { Etnia } from '../../../../../models/etnia.model';

@Component({
  selector: 'app-editar-etnia',
  templateUrl: './editar-etnia.component.html',
  styleUrls: ['./editar-etnia.component.scss']
})
export class EditarEtniaComponent implements OnInit {
  etniaForm: FormGroup;
  id: number;
  submitting = false;
  loading = true;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private etniaService: EtniaService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.id = +this.route.snapshot.params['id'];
    this.etniaForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', Validators.maxLength(255)]
    });
  }

  ngOnInit(): void {
    this.cargarEtnia();
  }

  cargarEtnia(): void {
    this.loading = true;
    this.error = null;
    
    this.etniaService.getEtnia(this.id).subscribe({
      next: (etnia: Etnia) => {
        this.etniaForm.patchValue({
          name: etnia.name,
          description: etnia.description
        });
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar etnia', err);
        this.error = 'No se pudo cargar la etnia. Por favor intente nuevamente.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.etniaForm.invalid) {
      this.etniaForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;

    const etniaActualizada: Etnia = {
      ...this.etniaForm.value
    };

    this.etniaService.updateEtnia(this.id, etniaActualizada).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/dashboard/admin/configuracion/etnias']);
      },
      error: (err: any) => {
        console.error('Error al actualizar etnia', err);
        this.error = 'No se pudo actualizar la etnia. Por favor intente nuevamente.';
        this.submitting = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/configuracion/etnias']);
  }
}
