import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { BusinessService } from '../../../../../services/business.service';
import {
  CalidadDocumentoDto,
  CalidadDocumentoPayload,
  CalidadDocumentosService
} from '../../../../../services/calidad-documentos.service';

export interface IsoCatalogOption {
  id: number;
  name: string;
  code: string;
}

@Component({
  selector: 'app-calidad-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calidad-documentos.component.html',
  styleUrls: ['./calidad-documentos.component.scss']
})
export class CalidadDocumentosComponent implements OnInit, OnDestroy {
  showNewRecordForm = false;
  formParentId: number | null = null;
  ruc: string | null = null;

  processOptions: IsoCatalogOption[] = [];
  documentTypeOptions: IsoCatalogOption[] = [];
  almacenamientoOptions: string[] = [];
  disposicionOptions: string[] = [];

  estadoOptions = ['VIGENTE', 'EN REVISIÓN', 'EXPIRADO', 'OBSOLETO'];
  vigenciaOptions = ['Anual', 'Semestral', 'Trimestral', 'Bienal', 'Indefinida'];

  documents: CalidadDocumentoDto[] = [];
  expandedIds = new Set<number>();

  /** Filtros de la lista maestra */
  filterProceso = 'ALL';
  filterTipo = 'ALL';
  filterSearch = '';

  formModel = this.createDefaultFormModel();
  selectedFile: File | null = null;
  selectedFileName = '';
  codigoPreview = '';
  formError: string | null = null;
  catalogLoading = false;
  listLoading = false;
  saving = false;

  /** Modal de vista previa de archivo (solo ver + cerrar). */
  showFileViewer = false;
  fileViewerLoading = false;
  fileViewerError: string | null = null;
  fileViewerTitle = '';
  fileViewerKind: 'pdf' | 'image' | 'other' = 'other';
  fileViewerObjectUrl: string | null = null;
  fileViewerSafeUrl: SafeResourceUrl | null = null;

  stats: Array<{ label: string; value: string; border: string; sub?: string }> = [
    { label: 'Documentos principales', value: '0', border: 'brd--red' },
    { label: 'Internos', value: '0', border: 'brd--slate', sub: 'Base de datos' },
  ];

  constructor(
    private route: ActivatedRoute,
    private businessService: BusinessService,
    private docsApi: CalidadDocumentosService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnDestroy(): void {
    this.closeFileViewer();
  }

  ngOnInit(): void {
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) {
        this.ruc = found;
        break;
      }
      parent = parent.parent as ActivatedRoute | null;
    }
    if (!this.ruc) {
      return;
    }
    this.loadDocuments();
    this.catalogLoading = true;
    this.businessService.getByRuc(this.ruc).subscribe({
      next: (biz: any) => {
        const id = Number(biz?.id);
        if (!id) {
          this.catalogLoading = false;
          return;
        }
        this.applyIsoItems((biz as any)?.iso9001CatalogItems);
        this.businessService.getDetails(id).subscribe({
          next: (details: any) => {
            this.applyIsoItems((details as any)?.iso9001CatalogItems);
            this.catalogLoading = false;
          },
          error: () => {
            this.catalogLoading = false;
          }
        });
      },
      error: () => {
        this.catalogLoading = false;
      }
    });
  }

  get rootDocuments(): CalidadDocumentoDto[] {
    return this.documents.filter(d => d.parentId == null);
  }

  get filteredRootDocuments(): CalidadDocumentoDto[] {
    const q = this.filterSearch.trim().toLowerCase();
    return this.rootDocuments.filter(d => {
      if (this.filterProceso !== 'ALL' && d.procesoCode !== this.filterProceso) {
        return false;
      }
      if (this.filterTipo !== 'ALL' && d.tipoCode !== this.filterTipo) {
        return false;
      }
      if (!q) {
        return true;
      }
      const hay = `${d.codigo} ${d.nombre} ${d.procesoName} ${d.procesoCode} ${d.tipoName} ${d.responsable || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  get procesoFilterOptions(): Array<{ code: string; name: string }> {
    const map = new Map<string, string>();
    for (const d of this.rootDocuments) {
      if (d.procesoCode) {
        map.set(d.procesoCode, d.procesoName || d.procesoCode);
      }
    }
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  get tipoFilterOptions(): Array<{ code: string; name: string }> {
    const map = new Map<string, string>();
    for (const d of this.documents) {
      if (d.tipoCode) {
        map.set(d.tipoCode, d.tipoName || d.tipoCode);
      }
    }
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  get kpiProcesosCubiertos(): number {
    return this.procesoFilterOptions.length;
  }

  get kpiProximaRevision(): string {
    const dates = this.rootDocuments
      .map(d => d.fechaProxRevision)
      .filter((x): x is string => !!x)
      .sort();
    return dates.length ? dates[0] : '—';
  }

  get kpiSinAlertas(): boolean {
    return !this.rootDocuments.some(d => {
      const e = (d.estado || '').toUpperCase();
      return e.includes('EXPIR') || e.includes('OBSOLE');
    });
  }

  childrenOf(parentId: number): CalidadDocumentoDto[] {
    return this.documents
      .filter(d => d.parentId === parentId)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }

  childCount(parentId: number): number {
    return this.documents.filter(d => d.parentId === parentId).length;
  }

  isExpanded(id: number): boolean {
    return this.expandedIds.has(id);
  }

  toggleExpand(doc: CalidadDocumentoDto, event?: Event): void {
    event?.stopPropagation();
    if (this.expandedIds.has(doc.id)) {
      this.expandedIds.delete(doc.id);
    } else {
      this.expandedIds.add(doc.id);
    }
    this.expandedIds = new Set(this.expandedIds);
  }

  statusClass(estado: string | undefined): string {
    const e = (estado || '').toUpperCase();
    if (e.includes('EXPIR') || e.includes('OBSOLE')) {
      return 'st--err';
    }
    if (e.includes('REVIS')) {
      return 'st--warn';
    }
    return 'st--ok';
  }

  loadDocuments(): void {
    if (!this.ruc) {
      return;
    }
    this.listLoading = true;
    this.docsApi.list(this.ruc).subscribe({
      next: rows => {
        this.documents = rows || [];
        this.refreshStats();
        this.listLoading = false;
      },
      error: err => {
        console.error(err);
        this.listLoading = false;
        alert(err?.error?.message || 'No se pudo cargar la lista de documentos.');
      }
    });
  }

  private applyIsoItems(items: any): void {
    if (!Array.isArray(items) || !items.length) {
      return;
    }
    const usedCodes = new Set<string>();
    const mapOpts = (catalogCode: string): IsoCatalogOption[] =>
      items
        .filter((x: any) => String(x?.catalogCode) === catalogCode)
        .map((x: any) => {
          const name = String(x?.name ?? '').trim();
          let code = String(x?.code ?? '').trim().toUpperCase();
          if (!code && name) {
            code = this.inventCodeFromName(name, usedCodes);
          } else if (code) {
            usedCodes.add(code);
          }
          return { id: Number(x.id), name, code };
        })
        .filter((x: IsoCatalogOption) => x.id && x.name);

    const mapNames = (catalogCode: string): string[] =>
      Array.from(
        new Set(
          items
            .filter((x: any) => String(x?.catalogCode) === catalogCode)
            .map((x: any) => String(x?.name ?? '').trim())
            .filter(Boolean)
        )
      );

    const uniqById = (arr: IsoCatalogOption[]) => {
      const seen = new Set<number>();
      return arr.filter(x => {
        if (seen.has(x.id)) {
          return false;
        }
        seen.add(x.id);
        return true;
      });
    };

    this.processOptions = uniqById(mapOpts('proceso'));
    this.documentTypeOptions = uniqById(mapOpts('tipo-documento'));
    this.almacenamientoOptions = mapNames('almacenamiento');
    this.disposicionOptions = mapNames('disposicion-final');
    if (!this.almacenamientoOptions.length) {
      this.almacenamientoOptions = ['Servidor SGI', 'Carpeta Red', 'Intranet', 'Archivo Físico'];
    }
    if (!this.disposicionOptions.length) {
      this.disposicionOptions = ['Archivo Digital', 'Archivo Físico', 'Reciclaje', 'Destrucción Segura'];
    }
  }

  private inventCodeFromName(name: string, used: Set<string>): string {
    const n = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
    const known: Array<[RegExp, string]> = [
      [/TALENTO|HUMANO|\bTH\b/, 'TH'],
      [/CALIDAD|\bCAL\b|\bSGC\b/, 'CAL'],
      [/OPERAC/, 'OPE'],
      [/MANTEN/, 'MTO'],
      [/LOGIST/, 'LOG'],
      [/\bMANUAL\b/, 'MAN'],
      [/PROCED/, 'PRO'],
      [/INSTRUCT/, 'INS'],
      [/FORMAT|REGISTRO/, 'FOR'],
      [/POLIT/, 'POL'],
    ];
    for (const [re, code] of known) {
      if (re.test(n) && !used.has(code)) {
        used.add(code);
        return code;
      }
    }
    const stop = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'EN', 'A', 'PARA']);
    const words = n.split(/[^A-Z0-9]+/).filter(w => w.length > 0 && !stop.has(w));
    let candidate = words.length >= 2
      ? words.map(w => w[0]).join('').slice(0, 3)
      : (words[0] || 'XX').replace(/[^A-Z]/g, '').slice(0, 3);
    if (candidate.length < 2) {
      candidate = (candidate + 'XX').slice(0, 3);
    }
    let finalCode = candidate;
    let i = 1;
    while (used.has(finalCode)) {
      finalCode = (candidate.slice(0, 2) + i).slice(0, 5);
      i++;
    }
    used.add(finalCode);
    return finalCode;
  }

  private refreshStats(): void {
    const roots = this.rootDocuments.length;
    this.stats = [
      { label: 'Documentos principales', value: String(roots), border: 'brd--red' },
      {
        label: 'Internos (INS/FOR…)',
        value: String(this.documents.length - roots),
        border: 'brd--slate',
        sub: 'Multiempresa / BD'
      },
    ];
  }

  get formParent(): CalidadDocumentoDto | null {
    if (this.formParentId == null) {
      return null;
    }
    return this.documents.find(d => d.id === this.formParentId) || null;
  }

  openNewRecordForm(): void {
    this.formParentId = null;
    this.formModel = this.createDefaultFormModel();
    this.selectedFile = null;
    this.selectedFileName = '';
    this.formError = null;
    this.updateCodigoPreview();
    this.recalculateVigenciaFields();
    this.showNewRecordForm = true;
  }

  openChildForm(parent: CalidadDocumentoDto, event?: Event): void {
    event?.stopPropagation();
    this.expandedIds.add(parent.id);
    this.expandedIds = new Set(this.expandedIds);
    this.formParentId = parent.id;
    this.formModel = this.createDefaultFormModel();
    this.formModel.procesoId = parent.procesoCatalogItemId != null ? String(parent.procesoCatalogItemId) : '';
    this.selectedFile = null;
    this.selectedFileName = '';
    this.formError = null;
    this.updateCodigoPreview();
    this.recalculateVigenciaFields();
    this.showNewRecordForm = true;
  }

  closeNewRecordForm(): void {
    this.showNewRecordForm = false;
    this.formParentId = null;
    this.formModel = this.createDefaultFormModel();
    this.selectedFile = null;
    this.selectedFileName = '';
    this.codigoPreview = '';
    this.formError = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    this.selectedFile = file;
    this.selectedFileName = file ? file.name : '';
  }

  onFormIdentityChange(): void {
    this.formError = null;
    this.updateCodigoPreview();
  }

  /** Al cambiar elaboración / revisión / vigencia → recalcular próximos días. */
  onVigenciaDatesChange(): void {
    this.recalculateVigenciaFields();
  }

  /**
   * - Si hay elaboración y no hay revisión → copia elaboración a revisión.
   * - Fecha próx. revisión = (revisión o elaboración) + periodo de vigencia.
   * - Días vigencia = diferencia en días (automático).
   */
  private recalculateVigenciaFields(): void {
    const elab = this.parseIsoDate(this.formModel.fechaElaboracion);
    let rev = this.parseIsoDate(this.formModel.fechaRevision);

    if (elab && !rev) {
      this.formModel.fechaRevision = this.formatIsoDate(elab);
      rev = elab;
    }

    const base = rev || elab;
    const vigencia = (this.formModel.vigencia || '').trim();

    if (!base || !vigencia || vigencia === 'Indefinida') {
      if (vigencia === 'Indefinida') {
        this.formModel.fechaProxRevision = '';
        this.formModel.diasVigencia = '';
      }
      return;
    }

    const next = this.addVigenciaPeriod(base, vigencia);
    if (!next) {
      this.formModel.fechaProxRevision = '';
      this.formModel.diasVigencia = '';
      return;
    }

    this.formModel.fechaProxRevision = this.formatIsoDate(next);
    this.formModel.diasVigencia = String(this.diffDays(base, next));
  }

  private addVigenciaPeriod(from: Date, vigencia: string): Date | null {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    switch (vigencia) {
      case 'Anual':
        d.setFullYear(d.getFullYear() + 1);
        return d;
      case 'Semestral':
        d.setMonth(d.getMonth() + 6);
        return d;
      case 'Trimestral':
        d.setMonth(d.getMonth() + 3);
        return d;
      case 'Bienal':
        d.setFullYear(d.getFullYear() + 2);
        return d;
      default:
        return null;
    }
  }

  private diffDays(from: Date, to: Date): number {
    const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.round((b - a) / 86400000);
  }

  private parseIsoDate(raw: string | null | undefined): Date | null {
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
      return null;
    }
    const [y, m, d] = raw.trim().split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
      return null;
    }
    return dt;
  }

  private formatIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  updateCodigoPreview(): void {
    if (this.formParentId != null) {
      this.codigoPreview = this.previewChildCodigo(this.formParentId, this.formModel.tipoId) || '';
      return;
    }
    this.codigoPreview = this.previewRootCodigo(this.formModel.procesoId, this.formModel.tipoId) || '';
  }

  private previewRootCodigo(procesoIdStr: string, tipoIdStr: string): string | null {
    const proceso = this.processOptions.find(p => String(p.id) === String(procesoIdStr));
    const tipo = this.documentTypeOptions.find(t => String(t.id) === String(tipoIdStr));
    if (!proceso?.code || !tipo?.code) {
      return null;
    }
    const prefix = `${proceso.code}-${tipo.code}-`;
    return `${prefix}${this.pad2(this.nextLocalSeq(prefix))}`;
  }

  private previewChildCodigo(parentId: number, tipoIdStr: string): string | null {
    const parent = this.documents.find(d => d.id === parentId);
    const tipo = this.documentTypeOptions.find(t => String(t.id) === String(tipoIdStr));
    if (!parent || !tipo?.code) {
      return null;
    }
    const prefix = `${parent.codigo}.${tipo.code}.`;
    return `${prefix}${this.pad2(this.nextLocalSeq(prefix))}`;
  }

  private nextLocalSeq(prefix: string): number {
    let max = 0;
    for (const d of this.documents) {
      if (!d.codigo.startsWith(prefix)) {
        continue;
      }
      const rest = d.codigo.slice(prefix.length);
      if (/^\d{2}$/.test(rest)) {
        max = Math.max(max, Number(rest));
      }
    }
    return max + 1;
  }

  private pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n);
  }

  saveRecord(): void {
    if (!this.ruc) {
      return;
    }
    this.formError = null;
    const parent = this.formParent;
    const tipo = this.documentTypeOptions.find(t => String(t.id) === String(this.formModel.tipoId));
    if (!tipo) {
      this.formError = 'Seleccione un tipo de documento.';
      return;
    }
    if (!this.formModel.nombreDocumento?.trim()) {
      this.formError = 'El nombre del documento es obligatorio.';
      return;
    }

    let proceso: IsoCatalogOption | null = null;
    if (!parent) {
      proceso = this.processOptions.find(p => String(p.id) === String(this.formModel.procesoId)) || null;
      if (!proceso) {
        this.formError = 'Seleccione un proceso.';
        return;
      }
    }

    this.recalculateVigenciaFields();
    const diasRaw = String(this.formModel.diasVigencia ?? '').trim();
    const diasVigencia = diasRaw === '' ? null : Number(diasRaw);

    const payload: CalidadDocumentoPayload = {
      parentId: parent ? parent.id : null,
      procesoCatalogItemId: parent ? parent.procesoCatalogItemId ?? null : proceso!.id,
      tipoCatalogItemId: tipo.id,
      procesoName: parent ? parent.procesoName : proceso!.name,
      procesoCode: parent ? parent.procesoCode : proceso!.code,
      tipoName: tipo.name,
      tipoCode: tipo.code,
      nombre: this.formModel.nombreDocumento.trim(),
      fechaElaboracion: this.formModel.fechaElaboracion || undefined,
      fechaRevision: this.formModel.fechaRevision || undefined,
      version: this.formModel.version || '01',
      fechaProxRevision: this.formModel.fechaProxRevision || undefined,
      diasVigencia: Number.isFinite(diasVigencia as number) ? (diasVigencia as number) : null,
      estado: this.formModel.estado || 'VIGENTE',
      almacenamiento: this.formModel.almacenamiento || undefined,
      responsable: this.formModel.responsable || undefined,
      vigencia: this.formModel.vigencia || undefined,
      disposicionFinal: this.formModel.disposicionFinal || undefined,
      observaciones: this.formModel.observaciones || undefined
    };

    this.saving = true;
    this.docsApi.create(this.ruc, payload, this.selectedFile).subscribe({
      next: created => {
        this.saving = false;
        if (parent) {
          this.expandedIds.add(parent.id);
          this.expandedIds = new Set(this.expandedIds);
        }
        this.closeNewRecordForm();
        this.loadDocuments();
        if (created?.codigo) {
          // ok
        }
      },
      error: err => {
        this.saving = false;
        this.formError = err?.error?.message || 'Error al guardar el documento.';
      }
    });
  }

  deleteDocument(id: number, event?: Event): void {
    event?.stopPropagation();
    if (!this.ruc) {
      return;
    }
    if (this.documents.some(d => d.parentId === id)) {
      alert('Primero elimine los documentos internos (instructivos/formatos) de este registro.');
      return;
    }
    if (!confirm('¿Eliminar este documento?')) {
      return;
    }
    this.docsApi.delete(this.ruc, id).subscribe({
      next: () => {
        this.expandedIds.delete(id);
        this.expandedIds = new Set(this.expandedIds);
        this.loadDocuments();
      },
      error: err => {
        alert(err?.error?.message || 'No se pudo eliminar.');
      }
    });
  }

  downloadFile(doc: CalidadDocumentoDto, event?: Event): void {
    event?.stopPropagation();
    this.viewFile(doc, event);
  }

  viewFile(doc: CalidadDocumentoDto, event?: Event): void {
    event?.stopPropagation();
    if (!this.ruc || !doc.filePath) {
      return;
    }
    this.closeFileViewer(false);
    this.showFileViewer = true;
    this.fileViewerLoading = true;
    this.fileViewerError = null;
    this.fileViewerTitle = doc.fileName || doc.codigo || 'Documento';

    this.docsApi.getFileBlob(this.ruc, doc.id).subscribe({
      next: blob => {
        const type = (blob.type || '').toLowerCase();
        const name = (doc.fileName || '').toLowerCase();
        if (type.includes('pdf') || name.endsWith('.pdf')) {
          this.fileViewerKind = 'pdf';
        } else if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name)) {
          this.fileViewerKind = 'image';
        } else {
          this.fileViewerKind = 'other';
        }
        const typed =
          this.fileViewerKind === 'pdf' && !type.includes('pdf')
            ? new Blob([blob], { type: 'application/pdf' })
            : blob;
        this.fileViewerObjectUrl = URL.createObjectURL(typed);
        this.fileViewerSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.fileViewerObjectUrl);
        this.fileViewerLoading = false;
      },
      error: () => {
        this.fileViewerLoading = false;
        this.fileViewerError = 'No se pudo abrir el archivo.';
      }
    });
  }

  closeFileViewer(hideModal = true): void {
    if (this.fileViewerObjectUrl) {
      URL.revokeObjectURL(this.fileViewerObjectUrl);
    }
    this.fileViewerObjectUrl = null;
    this.fileViewerSafeUrl = null;
    if (hideModal) {
      this.showFileViewer = false;
    }
    this.fileViewerLoading = false;
    this.fileViewerError = null;
    this.fileViewerTitle = '';
    this.fileViewerKind = 'other';
  }

  labelProceso(opt: IsoCatalogOption): string {
    return `${opt.name} (${opt.code || '???'})`;
  }

  labelTipo(opt: IsoCatalogOption): string {
    return `${opt.name} (${opt.code || '???'})`;
  }

  private createDefaultFormModel() {
    return {
      procesoId: '' as string,
      tipoId: '' as string,
      fechaElaboracion: '',
      fechaRevision: '',
      version: '01',
      fechaProxRevision: '',
      diasVigencia: '' as string,
      estado: 'VIGENTE',
      almacenamiento: '',
      responsable: '',
      vigencia: 'Anual',
      disposicionFinal: '',
      nombreDocumento: '',
      observaciones: ''
    };
  }
}
