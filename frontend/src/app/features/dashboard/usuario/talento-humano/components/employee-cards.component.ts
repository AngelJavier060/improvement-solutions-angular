import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { EmployeeCardService, EmployeeCardResponse, CreateEmployeeCardRequest } from '../services/employee-card.service';
import { CardService, CardCatalog } from '../../../../../services/card.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ThFilePreviewService } from '../services/th-file-preview.service';

@Component({
  selector: 'app-employee-cards',
  templateUrl: './employee-cards.component.html',
  styleUrls: ['./employee-cards.component.scss']
})
export class EmployeeCardsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() employeeId!: number;
  @Input() employeeCedula!: string;
  @Output() changed = new EventEmitter<void>();

  records: EmployeeCardResponse[] = [];
  catalog: CardCatalog[] = [];

  loading = false;
  saving = false;
  error: string | null = null;
  canWrite = false;

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

  showEditForm = false;
  editSaving = false;
  editTarget: EmployeeCardResponse | null = null;
  editCardName = '';
  editCardNumber = '';
  editIssueDate = '';
  editExpiryDate = '';
  editObservations = '';
  editFiles: File[] = [];
  editFileError: string | null = null;

  constructor(
    private employeeCardService: EmployeeCardService,
    private cardCatalogService: CardService,
    private authService: AuthService,
    private filePreview: ThFilePreviewService
  ) {}

  ngOnDestroy(): void {
    this.filePreview.close();
  }

  ngOnInit(): void {
    this.canWrite = this.authService.canWrite();
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
      next: (items) => {
        this.catalog = items || [];
        this.syncSelectedCard();
      },
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
        this.syncSelectedCard();
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
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
    } catch {
      return String(s || '').toLowerCase().trim();
    }
  }

  /** Última tarjeta vigente por tipo (no histórico). Caducadas se consideran pendientes de renovar. */
  private currentActiveCards(): EmployeeCardResponse[] {
    const items = this.records || [];
    const hasActive = items.some(r => (r as any).active !== undefined);
    const base = hasActive
      ? items.filter(r => (r as any).active === true || (r as any).active === undefined)
      : items;

    const byKey = new Map<string, EmployeeCardResponse>();
    for (const r of base) {
      const id = Number((r as any)?.card?.id);
      const key = !Number.isNaN(id) && id > 0
        ? `id:${id}`
        : `name:${this.normalizeName((r as any)?.card?.name || '')}`;
      const prev = byKey.get(key);
      if (!prev || this.cardScore(r) > this.cardScore(prev)) {
        byKey.set(key, r);
      }
    }
    return Array.from(byKey.values());
  }

  private cardScore(r: EmployeeCardResponse): number {
    const toTs = (s?: string) => {
      if (!s) return Number.NEGATIVE_INFINITY;
      const t = new Date(s as string).getTime();
      return isNaN(t) ? Number.NEGATIVE_INFINITY : t;
    };
    const exp = toTs(r.expiry_date);
    if (exp !== Number.NEGATIVE_INFINITY) return exp;
    return toTs(r.issue_date);
  }

  /**
   * Catálogo pendiente de subir.
   * Si ya hay un registro activo y no caducado, esa tarjeta no aparece.
   * Vuelve a listarse cuando está caducada (renovación) o se elimina.
   */
  availableCards(): CardCatalog[] {
    const usedIds = new Set<number>();
    const usedNames = new Set<string>();
    for (const r of this.currentActiveCards()) {
      if (this.getExpiryStatus(r.expiry_date) === 'Caducado') {
        continue;
      }
      const id = Number((r as any)?.card?.id);
      if (!Number.isNaN(id) && id > 0) usedIds.add(id);
      const name = this.normalizeName((r as any)?.card?.name || '');
      if (name) usedNames.add(name);
    }
    return (this.catalog || []).filter(c => {
      const id = Number(c.id);
      if (!Number.isNaN(id) && usedIds.has(id)) return false;
      const name = this.normalizeName(c.name || '');
      return !name || !usedNames.has(name);
    });
  }

  private syncSelectedCard(): void {
    if (!this.selectedCardId) return;
    const stillAvailable = this.availableCards()
      .some(c => String(c.id) === String(this.selectedCardId));
    if (!stillAvailable) this.selectedCardId = '';
  }

  // Lista vigente: última tarjeta activa. El histórico vive en la pestaña Histórico.
  filteredCards(): EmployeeCardResponse[] {
    const latest = [...this.currentActiveCards()];
    latest.sort((a, b) => ((a as any)?.card?.name || '').localeCompare(((b as any)?.card?.name || '')));
    return latest;
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
    const stillAvailable = this.availableCards()
      .some(c => String(c.id) === String(this.selectedCardId));
    if (!stillAvailable) {
      this.error = 'Esta tarjeta ya está registrada. Elimínela o renuévela cuando caduque.';
      this.syncSelectedCard();
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

  openFile(file: { file: string; file_name?: string; file_type?: string }): void {
    this.filePreview.open(file);
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

  // === Edición ===
  openEdit(r: EmployeeCardResponse): void {
    this.editTarget = r;
    this.editCardName = (r as any)?.card?.name || 'tarjeta';
    this.editCardNumber = r.card_number || '';
    this.editIssueDate = this.toInputDate(r.issue_date);
    this.editExpiryDate = this.toInputDate(r.expiry_date);
    this.editObservations = r.observations || '';
    this.editFiles = [];
    this.editFileError = null;
    this.showEditForm = true;
  }

  cancelEditForm(): void {
    this.showEditForm = false;
    this.editSaving = false;
    this.editTarget = null;
    this.editCardName = '';
    this.editCardNumber = '';
    this.editIssueDate = '';
    this.editExpiryDate = '';
    this.editObservations = '';
    this.editFiles = [];
    this.editFileError = null;
  }

  onEditFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) this.editFiles = Array.from(input.files);
  }

  submitEdit(): void {
    if (!this.editTarget) return;
    if (this.editIssueDate && this.editExpiryDate && this.editIssueDate > this.editExpiryDate) {
      this.editFileError = 'La fecha de emisión no puede ser posterior a la fecha de expiración.';
      return;
    }
    this.editSaving = true;
    this.editFileError = null;
    this.employeeCardService.update(this.editTarget.id, {
      card_number: this.editCardNumber || undefined,
      issue_date: this.editIssueDate || undefined,
      expiry_date: this.editExpiryDate || undefined,
      observations: this.editObservations || undefined,
      files: this.editFiles.length ? this.editFiles : undefined
    }).subscribe({
      next: () => {
        this.editSaving = false;
        this.cancelEditForm();
        this.loadCards();
        this.changed.emit();
      },
      error: (err) => {
        console.error('Error actualizando tarjeta', err);
        this.editSaving = false;
        this.editFileError = err?.error?.message || 'No se pudo guardar la edición.';
      }
    });
  }

  private toInputDate(value?: string | null): string {
    if (!value) return '';
    const s = String(value);
    return s.length >= 10 ? s.substring(0, 10) : s;
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
