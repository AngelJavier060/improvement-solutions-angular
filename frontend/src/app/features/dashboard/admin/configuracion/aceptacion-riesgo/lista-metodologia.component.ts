import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MetodologiaRiesgo } from '../../../../../models/metodologia-riesgo.model';
import { ParametroMetodologia } from '../../../../../models/parametro-metodologia.model';
import { MetodologiaRiesgoService } from '../../../../../services/metodologia-riesgo.service';

@Component({
  selector: 'app-lista-metodologia',
  templateUrl: './lista-metodologia.component.html',
  styleUrls: ['./lista-metodologia.component.scss']
})
export class ListaMetodologiaComponent implements OnInit {
  items: MetodologiaRiesgo[] = [];
  loading = true;
  error = '';
  expandedCards: Set<number> = new Set();

  constructor(private service: MetodologiaRiesgoService, private router: Router) {}

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;
    this.service.getAll().subscribe({
      next: (data) => {
        this.items = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las metodologías';
        this.loading = false;
        console.error(err);
      }
    });
  }

  deleteItem(id: number): void {
    if (confirm('¿Está seguro de eliminar esta metodología y todos sus parámetros?')) {
      this.service.delete(id).subscribe({
        next: () => this.loadItems(),
        error: (err) => {
          this.error = 'Error al eliminar la metodología';
          console.error(err);
        }
      });
    }
  }

  goToNew(): void {
    this.router.navigate(['dashboard/admin/configuracion/aceptacion-riesgo/nueva']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['dashboard/admin/configuracion/aceptacion-riesgo/editar', id]);
  }

  goBack(): void {
    this.router.navigate(['dashboard/admin/configuracion']);
  }

  toggleExpand(id: number): void {
    if (this.expandedCards.has(id)) {
      this.expandedCards.delete(id);
    } else {
      this.expandedCards.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedCards.has(id);
  }

  getFormulaDisplay(item: MetodologiaRiesgo): string {
    if (!item.parametros) return '';
    const calculated = item.parametros.filter(p => p.isCalculated && p.formula);
    return calculated.map(p => `${p.code} = ${p.formula}`).join(' | ');
  }

  getNonCalculatedParams(item: MetodologiaRiesgo): ParametroMetodologia[] {
    return (item.parametros || []).filter(p => !p.isCalculated);
  }

  getCalculatedParams(item: MetodologiaRiesgo): ParametroMetodologia[] {
    return (item.parametros || []).filter(p => p.isCalculated);
  }

  getTotalNiveles(item: MetodologiaRiesgo): number {
    return (item.parametros || []).reduce((acc, p) => acc + (p.niveles?.length || 0), 0);
  }

  getLevelColors(param: ParametroMetodologia): string[] {
    return (param.niveles || []).slice(0, 5).map(n => n.color || '#94a3b8');
  }
}
