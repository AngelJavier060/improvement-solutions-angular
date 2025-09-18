import { Pipe, PipeTransform } from '@angular/core';
import { CatalogStoreService } from '../core/services/catalog-store.service';

@Pipe({ name: 'name', pure: false })
export class NameResolverPipe implements PipeTransform {
  constructor(private catalog: CatalogStoreService) {
    this.catalog.ensureLoaded();
  }

  transform(value: any, kind: string): string {
    // 1) Si es string mostrable
    if (typeof value === 'string') {
      const s = value.trim();
      return s.length > 0 ? s : 'Sin asignar';
    }

    // 2) Si es número: buscar en catálogo
    if (typeof value === 'number') {
      const name = this.catalog.getName(kind, value);
      return name || `#${value}`;
    }

    // 3) Si es objeto
    if (value && typeof value === 'object') {
      // Empleado -> cargo/departamento
      if (kind === 'employee-position') {
        const direct = value?.position?.name || value?.position_name || value?.positionName;
        if (this.isNonEmpty(direct)) return String(direct);
        const id = value?.position_id ?? value?.positionId ?? value?.position?.id;
        const name = this.catalog.getName('position', id);
        return name || (id != null ? `#${id}` : 'Sin asignar');
      }
      if (kind === 'employee-department') {
        const direct = value?.department?.name || value?.department_name || value?.departmentName;
        if (this.isNonEmpty(direct)) return String(direct);
        const id = value?.department_id ?? value?.departmentId ?? value?.department?.id;
        const name = this.catalog.getName('department', id);
        return name || (id != null ? `#${id}` : 'Sin asignar');
      }

      // Objetos de catálogos o anidados
      const possible = [
        value?.name,
        value?.nombre,
        value?.title,
        value?.description,
        value?.position?.name,
        value?.department?.name,
        value?.typeDocument?.name,
        value?.typeContract?.name,
        value?.obligationMatrix?.name,
      ];
      for (const v of possible) {
        if (this.isNonEmpty(v)) return String(v);
      }

      // Si solo trae ID
      const idGuess = value?.id ?? value?.position_id ?? value?.department_id ?? value?.type_document_id ?? value?.typeContractId ?? value?.obligation_matrix_id;
      const name = this.catalog.getName(kind, idGuess);
      if (this.isNonEmpty(name)) return String(name);

      return 'Sin asignar';
    }

    return 'Sin asignar';
  }

  private isNonEmpty(v: any): boolean {
    return v !== undefined && v !== null && String(v).trim().length > 0;
  }
}
