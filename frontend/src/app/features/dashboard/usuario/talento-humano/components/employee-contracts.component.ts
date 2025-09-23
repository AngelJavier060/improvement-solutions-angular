import { Component, Input, OnInit } from '@angular/core';
import { ContractService, CreateEmployeeContractRequest, EmployeeContractResponse } from '../services/contract.service';
import { ConfigurationService, TypeContract } from '../services/configuration.service';
import { HttpClient, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-employee-contracts',
  templateUrl: './employee-contracts.component.html',
  styleUrls: ['./employee-contracts.component.scss']
})
export class EmployeeContractsComponent implements OnInit {
  @Input() employeeId!: number;
  @Input() employeeCedula!: string;
  @Input() businessId!: number;

  contracts: EmployeeContractResponse[] = [];
  typeContracts: TypeContract[] = [];

  loading = false;
  saving = false;
  error: string | null = null;

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
    private http: HttpClient
  ) {}

  ngOnInit(): void {
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

  // Abrir archivo con autenticación (evitar 401 en enlaces directos)
  openFile(file: { file: string; file_name?: string }): void {
    const url = file.file;
    this.http.get(url, { observe: 'response', responseType: 'blob' }).subscribe({
      next: (resp: HttpResponse<Blob>) => {
        const blob = resp.body as Blob;
        const contentType = resp.headers.get('Content-Type') || 'application/pdf';
        const typed = new Blob([blob], { type: contentType });
        const objectUrl = window.URL.createObjectURL(typed);
        window.open(objectUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      },
      error: (err) => {
        console.error('Error abriendo archivo de contrato', err);
        alert('No se pudo abrir el archivo');
      }
    });
  }
}
