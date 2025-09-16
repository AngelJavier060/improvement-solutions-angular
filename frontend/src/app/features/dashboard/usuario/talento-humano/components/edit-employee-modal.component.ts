import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmployeeService } from '../services/employee.service';
import { Employee, UpdateEmployeeRequest } from '../models/employee.model';
import { ContractorCompanyService } from '../../../../../services/contractor-company.service';
import { ContractorBlockService } from '../../../../../services/contractor-block.service';
import { ContractorCompany, ContractorBlock } from '../../../../../models/contractor-company.model';

@Component({
  selector: 'app-edit-employee-modal',
  templateUrl: './edit-employee-modal.component.html',
  styleUrls: ['./edit-employee-modal.component.scss']
})
export class EditEmployeeModalComponent implements OnInit, OnChanges {
  @Input() employee: Employee | null = null;
  @Input() businessId: number = 1; // Agregar el input businessId
  @Output() onClose = new EventEmitter<void>();
  @Output() onEmployeeUpdated = new EventEmitter<void>();

  employeeForm: FormGroup;
  loading = false;
  error: string | null = null;

  // Variables para empresas contratistas
  contractorCompanies: ContractorCompany[] = [];
  availableContractorBlocks: ContractorBlock[] = [];

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private contractorCompanyService: ContractorCompanyService,
    private contractorBlockService: ContractorBlockService
  ) {
    this.employeeForm = this.createForm();
  }

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee'] && this.employee) {
      this.populateForm();
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      cedula: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?\d{10,12}$/)]],
      email: ['', [Validators.required, Validators.email]],
      birthdate: ['', [Validators.required]],
      address: ['', [Validators.required]],
      contact_kinship: ['', [Validators.required]],
      contact_name: ['', [Validators.required]],
      contact_phone: ['', [Validators.required, Validators.pattern(/^\+?\d{10,12}$/)]],
      status: [true],
      position_id: [''],
      gender_id: [''],
      ethnicity_id: [''],
      civil_status_id: [''],
      resident_address_id: [''],
      iess_id: [''],
      degree_id: ['']
    });
  }

  populateForm(): void {
    if (this.employee) {
      // Formatear la fecha para el input date
      const birthdate = this.employee.birthdate ? 
        new Date(this.employee.birthdate).toISOString().split('T')[0] : '';

      this.employeeForm.patchValue({
        cedula: this.employee.cedula,
        name: this.employee.name,
        phone: this.employee.phone,
        email: this.employee.email,
        birthdate: birthdate,
        address: this.employee.address,
        contact_kinship: this.employee.contact_kinship,
        contact_name: this.employee.contact_name,
        contact_phone: this.employee.contact_phone,
        status: this.employee.status,
        position_id: this.employee.position_id || '',
        gender_id: this.employee.gender_id || '',
        ethnicity_id: this.employee.ethnicity_id || '',
        civil_status_id: this.employee.civil_status_id || '',
        resident_address_id: this.employee.resident_address_id || '',
        iess_id: this.employee.iess_id || '',
        degree_id: this.employee.degree_id || ''
      });
    }
  }

  onSubmit(): void {
    if (this.employeeForm.valid && this.employee && this.employee.id) {
      this.loading = true;
      this.error = null;

      const formData: UpdateEmployeeRequest = this.employeeForm.value;

      this.employeeService.updateEmployee(this.employee.id, formData).subscribe({
        next: (response) => {
          console.log('Empleado actualizado exitosamente:', response);
          this.onEmployeeUpdated.emit();
        },
        error: (error) => {
          console.error('Error al actualizar empleado:', error);
          this.error = 'Error al actualizar el empleado. Por favor, inténtelo de nuevo.';
          this.loading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  closeModal(): void {
    this.onClose.emit();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.employeeForm.controls).forEach(key => {
      const control = this.employeeForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['pattern']) {
        if (fieldName === 'cedula') return 'Cédula debe tener 10 dígitos';
        if (fieldName === 'phone' || fieldName === 'contact_phone') return 'Teléfono debe tener 10-12 dígitos';
      }
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return '';
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }
}