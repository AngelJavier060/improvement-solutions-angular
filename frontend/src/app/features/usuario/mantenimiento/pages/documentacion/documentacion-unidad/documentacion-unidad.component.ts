import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { FleetService } from '../../../../../../services/fleet.service';
import { FleetDocumentationService } from '../../../../../../services/fleet-documentation.service';
import { Vehicle } from '../../../../../../models/vehicle.model';
import { FleetComplianceDoc } from '../../../../../../models/fleet-documentation.model';
import { activeBusinessRuc } from '../documentacion-ruc.helper';

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

  docs(): FleetComplianceDoc[] {
    const all = this.docService.getDocuments(this.vehicleId);
    const q = this.search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      d =>
        (d.typeLabel || '').toLowerCase().includes(q) ||
        (d.referenceId || '').toLowerCase().includes(q) ||
        (d.typeCode || '').toLowerCase().includes(q)
    );
  }

  status(doc: FleetComplianceDoc) {
    return this.docService.complianceStatusForDoc(doc);
  }

  days(doc: FleetComplianceDoc): number | null {
    return this.docService.daysToExpiry(doc.expiryDate);
  }

  statusBadgeClass(doc: FleetComplianceDoc): string {
    const s = this.status(doc);
    if (!doc.active) return 'doc-badge doc-badge--neutral';
    if (s === 'VENCIDO') return 'doc-badge doc-badge--vencido';
    if (s === 'PROXIMO') return 'doc-badge doc-badge--proximo';
    if (s === 'NO_CADUCA') return 'doc-badge doc-badge--neutral';
    return 'doc-badge doc-badge--vigente';
  }

  statusText(doc: FleetComplianceDoc): string {
    if (!doc.active) return 'Inactivo';
    const s = this.status(doc);
    if (s === 'VENCIDO') return 'Vencido';
    if (s === 'PROXIMO') return 'Próximo a vencer';
    if (s === 'NO_CADUCA') return 'No caduca';
    if (s === 'SIN_VIGENCIA') return 'Sin vigencia';
    return 'Vigente';
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  rowClass(doc: FleetComplianceDoc): string {
    const s = this.status(doc);
    if (doc.active && s === 'VENCIDO') return 'table-danger bg-opacity-10';
    return '';
  }

  deleteDoc(doc: FleetComplianceDoc): void {
    if (!confirm(`¿Eliminar del listado activo "${doc.typeLabel}"? Quedará en el historial.`)) return;
    this.docService.deleteDocument(this.vehicleId, doc.id);
  }

  irHistorial(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion', 'unidad', this.vehicleId, 'historial']);
  }

  irRegistro(doc?: FleetComplianceDoc): void {
    const base = ['/usuario', this.businessRuc, 'mantenimiento', 'documentacion', 'unidad', this.vehicleId, 'registro'];
    if (doc) {
      this.router.navigate(base, { queryParams: { docId: doc.id } });
    } else {
      this.router.navigate(base);
    }
  }

  volverLista(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion']);
  }
}
