import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { FleetService } from '../../../../../../services/fleet.service';
import { FleetDocumentationService } from '../../../../../../services/fleet-documentation.service';
import { Vehicle } from '../../../../../../models/vehicle.model';
import { FleetComplianceDoc } from '../../../../../../models/fleet-documentation.model';
import {
  FLEET_DOC_CATEGORIES,
  FleetDocCategory,
  normalizeFleetDocCategory
} from '../../../../../../models/tipo-documento-vehiculo.model';
import { activeBusinessRuc } from '../documentacion-ruc.helper';

interface DocSection {
  code: FleetDocCategory;
  label: string;
  docs: FleetComplianceDoc[];
}

@Component({
  selector: 'app-documentacion-unidad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './documentacion-unidad.component.html',
  styleUrls: ['./documentacion-unidad.component.scss']
})
export class DocumentacionUnidadComponent implements OnInit, OnDestroy {
  businessRuc = '';
  vehicleId = 0;
  vehicle: Vehicle | null = null;
  loading = true;
  error = '';
  search = '';
  private docSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fleetService: FleetService,
    private docService: FleetDocumentationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.docSub = this.docService.changes$.subscribe(() => this.cdr.markForCheck());
    this.route.paramMap.subscribe(pm => {
      const id = Number(pm.get('vehicleId') || '');
      this.vehicleId = id;
      this.businessRuc = activeBusinessRuc(this.route);
      if (!this.businessRuc || !Number.isFinite(id) || id <= 0) {
        this.error = 'Unidad no válida.';
        this.loading = false;
        return;
      }
      this.docService.initForRuc(this.businessRuc);
      this.loadVehicle();
    });
  }

  ngOnDestroy(): void {
    this.docSub?.unsubscribe();
  }

  private loadVehicle(): void {
    this.loading = true;
    this.error = '';
    this.fleetService.getVehicleById(this.businessRuc, this.vehicleId).subscribe({
      next: v => {
        this.vehicle = v;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        console.error(err);
        this.error = 'No se pudo cargar la unidad.';
        this.vehicle = null;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  totalDocsCount(): number {
    return this.docService.getDocuments(this.vehicleId).length;
  }

  filteredDocs(): FleetComplianceDoc[] {
    const all = this.docService.getDocuments(this.vehicleId);
    const q = this.search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      d =>
        (d.typeLabel || '').toLowerCase().includes(q) ||
        (d.referenceId || '').toLowerCase().includes(q) ||
        (d.typeCode || '').toLowerCase().includes(q) ||
        (d.entidadRemitenteName || '').toLowerCase().includes(q)
    );
  }

  sections(): DocSection[] {
    const docs = this.filteredDocs();
    return FLEET_DOC_CATEGORIES.map(c => ({
      code: c.code,
      label: c.label,
      docs: docs.filter(d => normalizeFleetDocCategory(d.docCategory) === c.code)
    }));
  }

  status(doc: FleetComplianceDoc) {
    return this.docService.complianceStatusForDoc(doc);
  }

  days(doc: FleetComplianceDoc): number | null {
    return this.docService.daysToExpiry(doc.expiryDate);
  }

  statusText(doc: FleetComplianceDoc): string {
    if (!doc.active) return 'Inactivo';
    const s = this.status(doc);
    const d = this.days(doc);
    if (s === 'VENCIDO') return 'Vencido';
    if (s === 'PROXIMO') return d != null ? `Por Vencer (${d} días)` : 'Por Vencer';
    if (s === 'NO_CADUCA') return 'No caduca';
    if (s === 'SIN_VIGENCIA') return 'Sin vigencia';
    return 'Vigente';
  }

  statusTone(doc: FleetComplianceDoc): 'ok' | 'warn' | 'err' | 'muted' {
    if (!doc.active) return 'muted';
    const s = this.status(doc);
    if (s === 'VENCIDO') return 'err';
    if (s === 'PROXIMO') return 'warn';
    if (s === 'VIGENTE' || s === 'NO_CADUCA') return 'ok';
    return 'muted';
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  estadoUnidadLabel(): string {
    switch (this.vehicle?.estadoActivo) {
      case 'ACTIVO':
        return 'Activo';
      case 'EN_TALLER':
        return 'En taller';
      case 'DADO_DE_BAJA':
        return 'Fuera de servicio';
      default:
        return this.vehicle?.estadoActivo || '—';
    }
  }

  vehicleTitle(): string {
    const parts = [this.vehicle?.marca, this.vehicle?.modelo, this.vehicle?.tipoVehiculo].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'Unidad de flota';
  }

  sectionIcon(code: FleetDocCategory): string {
    if (code === 'CERTIFICACIONES') return 'fa-certificate';
    if (code === 'LIBERACIONES') return 'fa-clipboard-check';
    return 'fa-file-contract';
  }

  deleteDoc(doc: FleetComplianceDoc): void {
    if (!confirm(`¿Eliminar del listado activo "${doc.typeLabel}"? Quedará en el historial.`)) return;
    this.docService.deleteDocument(this.vehicleId, doc.id);
  }

  irHistorial(): void {
    this.router.navigate([
      '/usuario',
      this.businessRuc,
      'mantenimiento',
      'documentacion',
      'unidad',
      this.vehicleId,
      'historial'
    ]);
  }

  irRegistro(doc?: FleetComplianceDoc, category?: FleetDocCategory): void {
    const base = [
      '/usuario',
      this.businessRuc,
      'mantenimiento',
      'documentacion',
      'unidad',
      this.vehicleId,
      'registro'
    ];
    if (doc) {
      this.router.navigate(base, { queryParams: { docId: doc.id } });
    } else if (category) {
      this.router.navigate(base, { queryParams: { category } });
    } else {
      this.router.navigate(base);
    }
  }

  openPdf(doc: FleetComplianceDoc): void {
    if (doc.attachedDocumentUrl) {
      window.open(doc.attachedDocumentUrl, '_blank', 'noopener');
    }
  }

  volverLista(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion']);
  }
}
