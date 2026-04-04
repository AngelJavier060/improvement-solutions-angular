import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { FleetService } from '../../../../../../services/fleet.service';
import { FleetDocumentationService } from '../../../../../../services/fleet-documentation.service';
import { Vehicle } from '../../../../../../models/vehicle.model';
import { FleetComplianceDoc, FleetDocHistoryEntry } from '../../../../../../models/fleet-documentation.model';
import { activeBusinessRuc } from '../documentacion-ruc.helper';

@Component({
  selector: 'app-documentacion-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './documentacion-historial.component.html',
  styleUrls: ['./documentacion-historial.component.scss']
})
export class DocumentacionHistorialComponent implements OnInit, OnDestroy {
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
    this.fleetService.getVehicleById(this.businessRuc, this.vehicleId).subscribe({
      next: v => {
        this.vehicle = v;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        console.error(err);
        this.error = 'No se pudo cargar la unidad.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  entries(): FleetDocHistoryEntry[] {
    const all = this.docService.getHistory(this.vehicleId);
    const q = this.search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(e => {
      const s = e.snapshot;
      return (
        (s.typeLabel || '').toLowerCase().includes(q) ||
        (s.referenceId || '').toLowerCase().includes(q) ||
        this.actionLabel(e).toLowerCase().includes(q)
      );
    });
  }

  actionLabel(e: FleetDocHistoryEntry): string {
    if (e.action === 'UPDATED') return 'Actualización';
    if (e.action === 'DELETED') return 'Eliminación';
    return e.action;
  }

  actionBadgeClass(e: FleetDocHistoryEntry): string {
    if (e.action === 'DELETED') return 'doc-badge doc-badge--vencido';
    if (e.action === 'UPDATED') return 'doc-badge doc-badge--proximo';
    return 'doc-badge doc-badge--neutral';
  }

  snapshotStatus(s: FleetComplianceDoc): string {
    const st = this.docService.complianceStatusForDoc(s);
    if (st === 'VENCIDO') return 'Vencido';
    if (st === 'PROXIMO') return 'Próximo';
    if (st === 'NO_CADUCA') return 'No caduca';
    if (st === 'SIN_VIGENCIA') return 'Sin vigencia';
    return 'Vigente';
  }

  snapshotBadgeClass(s: FleetComplianceDoc): string {
    const st = this.docService.complianceStatusForDoc(s);
    if (st === 'VENCIDO') return 'doc-badge doc-badge--vencido';
    if (st === 'PROXIMO') return 'doc-badge doc-badge--proximo';
    if (st === 'NO_CADUCA') return 'doc-badge doc-badge--neutral';
    return 'doc-badge doc-badge--vigente';
  }

  period(s: FleetComplianceDoc): string {
    const a = this.fmt(s.issueDate);
    const b = s.expiryDate ? this.fmt(s.expiryDate) : '—';
    return `${a} – ${b}`;
  }

  private fmt(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-EC', { month: 'short', year: 'numeric' });
  }

  changedAt(e: FleetDocHistoryEntry): string {
    const d = new Date(e.changedAt);
    return isNaN(d.getTime()) ? e.changedAt : d.toLocaleString('es-EC');
  }

  volverUnidad(): void {
    this.router.navigate(['/usuario', this.businessRuc, 'mantenimiento', 'documentacion', 'unidad', this.vehicleId]);
  }
}
