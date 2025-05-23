import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BusinessService } from '../../../../services/business.service';
import { Business } from '../../../../models/business.model';

@Component({
  selector: 'app-editar-empresa',
  templateUrl: './editar-empresa.component.html',
  styleUrls: ['./editar-empresa.component.scss']
})
export class EditarEmpresaComponent implements OnInit {
  empresaForm: FormGroup;
  loading = false;
  error = '';
  submitted = false;
  empresaId: number;

  constructor(
    private fb: FormBuilder,
    private businessService: BusinessService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.empresaId = +this.route.snapshot.paramMap.get('id')!;
    
    this.empresaForm = this.fb.group({
      ruc: ['', [Validators.required, Validators.pattern(/^[0-9]{13}$/)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      nameShort: ['', [Validators.maxLength(50)]],
      representativeLegal: ['', [Validators.maxLength(100)]],
      email: ['', [Validators.email]],
      address: ['', [Validators.maxLength(200)]],
      phone: ['', [Validators.maxLength(20)]]
    });
  }

  ngOnInit(): void {
    this.cargarEmpresa();
  }

  cargarEmpresa(): void {
    this.loading = true;
    this.businessService.getById(this.empresaId).subscribe({
      next: (empresa: Business) => {
        this.empresaForm.patchValue({
          ruc: empresa.ruc,
          name: empresa.name,
          nameShort: empresa.nameShort,
          representativeLegal: empresa.representativeLegal,
          email: empresa.email,
          address: empresa.address,
          phone: empresa.phone
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los datos de la empresa';
        console.error(err);
        this.loading = false;
      }
    });
  }  get f(): any {
    return this.empresaForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.empresaForm.invalid) {
      return;
    }

    this.loading = true;
    this.businessService.update(this.empresaId, this.empresaForm.value).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/admin/empresas']);
      },
      error: (err) => {
        this.error = 'Error al actualizar la empresa';
        console.error(err);
        this.loading = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/empresas']);
  }
}
