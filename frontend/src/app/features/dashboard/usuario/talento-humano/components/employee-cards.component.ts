import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { EmployeeCardService, EmployeeCardResponse, CreateEmployeeCardRequest } from '../services/employee-card.service';
import { CardService, CardCatalog } from '../../../../../services/card.service';
import { HttpClient, HttpResponse } from '@angular/common/http';

@Component({
  selector: 'app-employee-cards',
  templateUrl: './employee-cards.component.html',
  styleUrls: ['./employee-cards.component.scss']
})
export class EmployeeCardsComponent implements OnInit, OnChanges {
  @Input() employeeId!: number;
  @Input() employeeCedula!: string;
  @Output() changed = new EventEmitter<void>();

  records: EmployeeCardResponse[] = [];
  catalog: CardCatalog[] = [];

  loading = false;
  saving = false;
  error: string | null = null;

  // Form inputs
  selectedCardId: string = '';
  cardNumber: string = '';
  issueDate: string = '';
  expiryDate: string = '';
  observations: string = '';
  selectedFiles: File[] = [];

  // Confirmación de renovación
  showRenewConfirm = false;
  renewTarget: EmployeeCardResponse | null = null;
  // Mostrar histórico
  showHistory = false;
  // Formulario de renovación (modal independiente)
  showRenewForm = false;
  renewSaving = false;
  renewIssueDate: string = '';
  renewExpiryDate: string = '';
  renewCardNumber: string = '';
  renewObservations: string = '';
  renewFiles: File[] = [];
  renewFileError: string | null = null;
  renewCardName: string = '';

  constructor(
    private employeeCardService: EmployeeCardService,
    private cardCatalogService: CardService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadCatalog();
    this.loadCards();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId'] || changes['employeeCedula']) {
      this.loadCards();
    }
  }

  loadCatalog(): void {
    this.cardCatalogService.getAll().subscribe({
      next: (items) => (this.catalog = items || []),
      error: (err) => console.error('Error loading card catalog', err)
    });
  }

  loadCards(): void {
    if (!this.employeeId) return;
    this.loading = true;
    // Siempre pedir con histórico; la visibilidad la controla filteredCards() según el toggle
    this.employeeCardService.getByBusinessEmployeeId(this.employeeId, true).subscribe({
      next: (items) => {
        this.records = items || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading employee cards', err);
        this.loading = false;
      }
    });
  }

  private normalizeName(s: string): string {
    try {
      return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // quitar tildes
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ') // no alfanum => espacio
        .trim()
        .replace(/\s+/g, ' '); // colapsar espacios
    } catch {
      return String(s || '').toLowerCase().trim();
    }
  }

  // Lista visible según "Ver histórico":
  // - Histórico OFF: mostrar SOLO el último registro por tarjeta (por id) y ocultar caducados.
  //   Si el backend envía bandera 'active', usarla (active !== false).
  // - Histórico ON: mostrar SOLO históricos (active === false) o, si no hay bandera, solo caducados.
  filteredCards(): EmployeeCardResponse[] {
    const items = this.records || [];
    if (this.showHistory) {
      return items.filter(r => {
        const a = (r as any).active;
        if (a === false) return true;
        if (a === true) return false;
        return this.getExpiryStatus(r.expiry_date) === 'Caducado';
      });
    }

    // Histórico OFF
    const hasActive = items.some(r => (r as any).active !== undefined);
    const base = hasActive ? items.filter(r => (r as any).active === true) : items;

    const score = (r: EmployeeCardResponse): number => {
      const toTs = (s?: string) => {
        if (!s) return Number.NEGATIVE_INFINITY;
        const t = new Date(s as string).getTime();
        return isNaN(t) ? Number.NEGATIVE_INFINITY : t;
      };
      const exp = toTs(r.expiry_date);
      if (exp !== Number.NEGATIVE_INFINITY) return exp;
      return toTs(r.issue_date);
    };

    // Agrupar por nombre normalizado de la tarjeta (no por id), para colapsar duplicados de catálogo con distinto id
    const byCardName = new Map<string, EmployeeCardResponse>();
    for (const r of base) {
      const key = this.normalizeName(((r as any)?.card?.name || ''));
      const prev = byCardName.get(key);
      if (!prev || score(r) > score(prev)) {
        byCardName.set(key, r);
      }
    }

    const latest = Array.from(byCardName.values());
    const visible = latest.filter(r => this.getExpiryStatus(r.expiry_date) !== 'Caducado');
    visible.sort((a, b) => ((a as any)?.card?.name || '').localeCompare(((b as any)?.card?.name || '')));
    return visible;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) this.selectedFiles = Array.from(input.files);
  }

  clearForm(): void {
    this.selectedCardId = '';
    this.cardNumber = '';
    this.issueDate = '';
    this.expiryDate = '';
    this.observations = '';
    this.selectedFiles = [];
  }

  createCard(): void {
    if (!this.employeeId || !this.selectedCardId) {
      this.error = 'Seleccione la tarjeta';
      return;
    }
    this.saving = true;
    this.error = null;

    const req: CreateEmployeeCardRequest = {
      business_employee_id: this.employeeId,
      card_id: Number(this.selectedCardId),
      card_number: this.cardNumber || undefined,
      issue_date: this.issueDate || undefined,
      expiry_date: this.expiryDate || undefined,
      observations: this.observations || undefined,
      files: this.selectedFiles && this.selectedFiles.length ? this.selectedFiles : undefined
    };

    this.employeeCardService.create(req).subscribe({
      next: () => {
        this.saving = false;
        this.clearForm();
        this.loadCards();
        this.changed.emit();
      },
      error: (err) => {
        console.error('Error creating card', err);
        const serverMsg = (err?.error && (err.error.message || err.error.error || (typeof err.error === 'string' ? err.error : null))) || err?.message;
        this.error = serverMsg ? `Error al crear registro: ${serverMsg}` : 'No se pudo crear el registro';
        this.saving = false;
      }
    });
  }

  deleteCard(item: EmployeeCardResponse): void {
    if (!confirm('¿Eliminar este registro de tarjeta?')) return;
    this.employeeCardService.delete(item.id).subscribe({
      next: () => { this.loadCards(); this.changed.emit(); },
      error: (err) => console.error('Error deleting card', err)
    });
  }

  // Abrir archivo usando token
  openFile(file: { file: string; file_name?: string }): void {
    const url = file.file;
    this.http.get(url, { observe: 'response', responseType: 'blob' }).subscribe({
      next: (resp: HttpResponse<Blob>) => {
        const blob = resp.body as Blob;
        const contentType = resp.headers.get('Content-Type') || 'application/octet-stream';
        const blobWithType = new Blob([blob], { type: contentType });
        const fileName = file.file_name || this.extractFileNameFromUrl(url);
        const blobUrl = window.URL.createObjectURL(blobWithType);
        const isViewable = contentType.startsWith('application/pdf') || contentType.startsWith('image/');
        if (isViewable) {
          window.open(blobUrl, '_blank');
        } else {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fileName || 'archivo';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      },
      error: (err) => {
        console.error('Error abriendo archivo', err);
        alert('No se pudo abrir el archivo');
      }
    });
  }

  private extractFileNameFromUrl(url: string): string {
    try {
      const lastSlash = url.lastIndexOf('/');
      if (lastSlash >= 0) return url.substring(lastSlash + 1);
      return url;
    } catch {
      return 'archivo';
    }
  }

  // === Helpers de vigencia ===
  getDaysLeft(dateStr?: string | null): string {
    if (!dateStr) return '-';
    try {
      const end = new Date(dateStr as string);
      if (isNaN(end.getTime())) return '-';
      const today = new Date();
      end.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      const diffMs = end.getTime() - today.getTime();
      const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return String(days);
    } catch {
      return '-';
    }
  }

  getExpiryStatus(dateStr?: string | null): string {
    if (!dateStr) return '-';
    const v = Number(this.getDaysLeft(dateStr));
    if (isNaN(v)) return '-';
    if (v < 0) return 'Caducado';
    if (v <= 30) return 'Próximo a vencer';
    return 'Vigente';
  }

  getExpiryBadgeClass(dateStr?: string | null): string {
    const status = this.getExpiryStatus(dateStr);
    if (status === 'Caducado') return 'bg-danger';
    if (status === 'Próximo a vencer') return 'bg-warning text-dark';
    if (status === 'Vigente') return 'bg-success';
    return 'bg-secondary';
  }

  // === Renovación ===
  renewCard(r: EmployeeCardResponse): void {
    try {
      this.selectedCardId = String((r as any)?.card?.id ?? '');
      this.cardNumber = '';
      this.observations = `Renovación de ${(r as any)?.card?.name || 'tarjeta'}`;
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      this.issueDate = `${today.getFullYear()}-${mm}-${dd}`;
      this.expiryDate = '';
      this.selectedFiles = [];
    } catch (e) {
      console.error('Error preparando renovación de tarjeta', e);
    }
  }

  openRenewConfirm(r: EmployeeCardResponse): void {
    this.renewTarget = r;
    this.showRenewConfirm = true;
  }

  closeRenewConfirm(): void {
    this.showRenewConfirm = false;
    this.renewTarget = null;
  }

  confirmRenew(): void {
    // Preparar modal de renovación sin tocar el formulario principal
    if (this.renewTarget) {
      this.renewCardName = (this.renewTarget as any)?.card?.name || 'tarjeta';
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      this.renewIssueDate = `${today.getFullYear()}-${mm}-${dd}`;
      this.renewExpiryDate = '';
      this.renewCardNumber = '';
      this.renewObservations = `Renovación de ${this.renewCardName}`;
      this.renewFiles = [];
      this.renewFileError = null;
    }
    this.showRenewConfirm = false;
    this.showRenewForm = true;
  }

  onRenewFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) this.renewFiles = Array.from(input.files);
  }

  cancelRenewForm(): void {
    this.showRenewForm = false;
    this.renewSaving = false;
    this.renewIssueDate = '';
    this.renewExpiryDate = '';
    this.renewCardNumber = '';
    this.renewObservations = '';
    this.renewFiles = [];
    this.renewFileError = null;
    this.renewCardName = '';
    this.renewTarget = null;
  }

  submitRenewal(): void {
    if (!this.employeeId || !this.renewTarget) return;
    if (!this.renewFiles || this.renewFiles.length === 0) {
      this.renewFileError = 'Adjunte al menos un archivo PDF.';
      return;
    }
    if (this.renewIssueDate && this.renewExpiryDate && this.renewIssueDate > this.renewExpiryDate) {
      this.renewFileError = 'La fecha de emisión no puede ser posterior a la fecha de expiración.';
      return;
    }
    this.renewSaving = true;
    const req: CreateEmployeeCardRequest = {
      business_employee_id: this.employeeId,
      card_id: Number((this.renewTarget as any)?.card?.id),
      card_number: this.renewCardNumber || undefined,
      issue_date: this.renewIssueDate || undefined,
      expiry_date: this.renewExpiryDate || undefined,
      observations: this.renewObservations || undefined,
      files: this.renewFiles
    };
    this.employeeCardService.create(req).subscribe({
      next: () => {
        this.renewSaving = false;
        this.cancelRenewForm();
        this.loadCards();
        this.changed.emit();
      },
      error: (err) => {
        console.error('Error creando renovación de tarjeta', err);
        this.renewSaving = false;
        this.renewFileError = 'No se pudo completar la renovación.';
      }
    });
  }
}
