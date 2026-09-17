import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ContractService, CreateEmployeeContractRequest, EmployeeContractResponse } from '../services/contract.service';
import { ConfigurationService, TypeContract } from '../services/configuration.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ThFilePreviewService } from '../services/th-file-preview.service';

@Component({
  selector: 'app-employee-contracts',
  templateUrl: './employee-contracts.component.html',
  styleUrls: ['./employee-contracts.component.scss']
})
export class EmployeeContractsComponent implements OnInit, OnDestroy {
  @Input() employeeId!: number;
  @Input() employeeCedula!: string;
  @Input() businessId!: number;

  contracts: EmployeeContractResponse[] = [];
  typeContracts: TypeContract[] = [];

  loading = false;
  saving = false;
  error: string | null = null;
  canWrite = false;

  // Form inputs
  selectedTypeContractId: string = '';
  description: string = '';
  startDate: string = '';
  endDate: string = '';
  salary?: number;
  selectedFiles: File[] = [];

  constructor(
    private contractService: ContractService,
    private configurationService: ConfigurationService,
    private authService: AuthService,
    private filePreview: ThFilePreviewService
  ) {}

  ngOnDestroy(): void {
    this.filePreview.close();
  }

  ngOnInit(): void {
    this.canWrite = this.authService.canWrite();
    this.loadTypeContracts();
    this.loadContracts();
  }

  loadTypeContracts(): void {
    if (!this.businessId) return;
    this.configurationService.getTypeContractsByCompany(this.businessId).subscribe({
      next: (list) => this.typeContracts = list || [],
      error: (err) => console.error('Error loading type contracts', err)
    });
  }

  loadContracts(): void {
    if (!this.employeeCedula) return;
    this.loading = true;
    this.contractService.getByEmployeeCedula(this.employeeCedula).subscribe({
      next: (res) => { this.contracts = res || []; this.loading = false; },
      error: (err) => { console.error('Error loading contracts', err); this.loading = false; }
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  clearForm(): void {
    this.selectedTypeContractId = '';
    this.description = '';
    this.startDate = '';
    this.endDate = '';
    this.salary = undefined;
    this.selectedFiles = [];
  }

  createContract(): void {
    if (!this.employeeId || !this.selectedTypeContractId || !this.startDate) {
      this.error = 'Tipo de contrato y fecha de inicio son obligatorios';
      return;
    }
    this.saving = true;
    this.error = null;

    const payload: CreateEmployeeContractRequest = {
      business_employee_id: this.employeeId,
      type_contract_id: Number(this.selectedTypeContractId),
      start_date: this.startDate,
      end_date: this.endDate || undefined,
      salary: this.salary,
      description: this.description || undefined,
      files: this.selectedFiles && this.selectedFiles.length ? this.selectedFiles : undefined
    };

    this.contractService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.clearForm();
        this.loadContracts();
      },
      error: (err) => {
        console.error('Error creating contract', err);
        this.error = 'No se pudo crear el contrato';
        this.saving = false;
      }
    });
  }

  deleteContract(contract: EmployeeContractResponse): void {
    if (!confirm('¿Eliminar este contrato?')) return;
    this.contractService.delete(contract.id).subscribe({
      next: () => this.loadContracts(),
      error: (err) => console.error('Error deleting contract', err)
    });
  }

  openFile(file: { file: string; file_name?: string; file_type?: string }): void {
    this.filePreview.open(file);
  }
}
