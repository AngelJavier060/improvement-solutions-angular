import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import {
  CatalogoViajeFactorItem,
  CatalogoViajeMetodologiaSection,
  catalogoGetIperNpValor,
  catalogoGetIperNsValor,
  catalogoGetIperRiesgo,
  catalogoGetNc,
  catalogoGetNd,
  catalogoGetNe,
  catalogoGetNrGtc,
  catalogoGetNpGtc,
  catalogoGetRiskClass,
  catalogoGetRiskLabel,
  catalogoGetRiesgoPrincipal,
  catalogoPeakGlobal,
  catalogoPeakRiesgoSection,
  catalogoSectionBadge,
  catalogoSectionSubtitle,
  catalogoSectionTitle,
  catalogoSystemStatus,
  trackByItemId,
  trackBySectionKey,
  catalogoRowIndex
} from './catalogo-viaje-lista.logic';

@Component({
  selector: 'app-catalogo-viaje-lista-shell',
  templateUrl: './catalogo-viaje-lista-shell.component.html',
  styleUrls: ['./catalogo-viaje-lista-shell.component.scss']
})
export class CatalogoViajeListaShellComponent {
  @Input() sections: CatalogoViajeMetodologiaSection<CatalogoViajeFactorItem>[] = [];
  @Input() items: CatalogoViajeFactorItem[] = [];
  @Input() metodologias: MetodologiaRiesgo[] = [];
  @Input() loading = false;
  @Input() error = '';

  @Input() pageIcon = 'fas fa-sliders-h';
  @Input() pageTitle = '';
  @Input() pageSubtitle = '';
  @Input() nameColumnLabel = 'Nombre';
  @Input() newButtonLabel = 'Nuevo registro';
  @Input() emptyIcon = 'fas fa-inbox';
  @Input() emptyTitle = 'Sin registros';
  @Input() emptyText = '';
  @Input() emptyButtonLabel = 'Agregar primero';
  @Input() globalTotalLabel = 'Total de rangos';

  @Output() back = new EventEmitter<void>();
  @Output() nuevo = new EventEmitter<void>();
  @Output() edit = new EventEmitter<CatalogoViajeFactorItem>();
  @Output() delete = new EventEmitter<CatalogoViajeFactorItem>();

  readonly trackSection = trackBySectionKey;
  readonly trackItem = trackByItemId;

  rowIndex(section: CatalogoViajeMetodologiaSection<CatalogoViajeFactorItem>, i: number): string {
    return catalogoRowIndex(section, i);
  }

  sectionTitle(section: CatalogoViajeMetodologiaSection<CatalogoViajeFactorItem>): string {
    return catalogoSectionTitle(section);
  }

  sectionSubtitle(section: CatalogoViajeMetodologiaSection<CatalogoViajeFactorItem>): string {
    return catalogoSectionSubtitle(section);
  }

  sectionBadge(profile: CatalogoViajeMetodologiaSection<CatalogoViajeFactorItem>['profile']): string {
    return catalogoSectionBadge(profile);
  }

  peakRiesgoSection(section: CatalogoViajeMetodologiaSection<CatalogoViajeFactorItem>): number {
    return catalogoPeakRiesgoSection(section, this.metodologias);
  }

  getPeakRiskGlobal(): number {
    return catalogoPeakGlobal(this.items, this.metodologias);
  }

  getSystemStatus(): string {
    return catalogoSystemStatus(this.items, this.metodologias);
  }

  getNe(item: CatalogoViajeFactorItem): number | null {
    return catalogoGetNe(item);
  }

  getNd(item: CatalogoViajeFactorItem): number | null {
    return catalogoGetNd(item);
  }

  getNc(item: CatalogoViajeFactorItem): number | null {
    return catalogoGetNc(item);
  }

  getNpGtc(item: CatalogoViajeFactorItem): number | null {
    return catalogoGetNpGtc(item);
  }

  getNrGtc(item: CatalogoViajeFactorItem): number | null {
    return catalogoGetNrGtc(item);
  }

  getIperNpValor(item: CatalogoViajeFactorItem): number | null {
    return catalogoGetIperNpValor(item);
  }

  getIperNsValor(item: CatalogoViajeFactorItem): number | null {
    return catalogoGetIperNsValor(item);
  }

  getIperRiesgo(item: CatalogoViajeFactorItem): number | null {
    return catalogoGetIperRiesgo(item);
  }

  getRiesgoPrincipal(item: CatalogoViajeFactorItem): number | null {
    return catalogoGetRiesgoPrincipal(item, this.metodologias);
  }

  getRiskClass(value: number | null, profile: CatalogoViajeMetodologiaSection<CatalogoViajeFactorItem>['profile']): string {
    return catalogoGetRiskClass(value, profile);
  }

  getRiskLabel(value: number | null, profile: CatalogoViajeMetodologiaSection<CatalogoViajeFactorItem>['profile']): string {
    return catalogoGetRiskLabel(value, profile);
  }

  onBack(): void {
    this.back.emit();
  }

  onNuevo(): void {
    this.nuevo.emit();
  }

  onEdit(item: CatalogoViajeFactorItem): void {
    this.edit.emit(item);
  }

  onDelete(item: CatalogoViajeFactorItem): void {
    this.delete.emit(item);
  }
}
