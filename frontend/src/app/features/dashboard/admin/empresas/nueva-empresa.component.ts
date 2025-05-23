import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BusinessService } from '../../../../services/business.service';

@Component({
  selector: 'app-nueva-empresa',
  templateUrl: './nueva-empresa.component.html',
  styleUrls: ['./nueva-empresa.component.scss']
})
export class NuevaEmpresaComponent implements OnInit {
  empresaForm: FormGroup;
  loading = false;
  error = '';
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private businessService: BusinessService,
    private router: Router
  ) {
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
  }
  get f(): any {
    return this.empresaForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.empresaForm.invalid) {
      return;
    }

    this.loading = true;
    this.businessService.create(this.empresaForm.value).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/admin/empresas']);
      },
      error: (err) => {
        this.error = 'Error al crear la empresa';
        console.error(err);
        this.loading = false;
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/dashboard/admin/empresas']);
  }
}
