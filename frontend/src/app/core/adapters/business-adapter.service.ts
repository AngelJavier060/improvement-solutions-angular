import { Injectable } from '@angular/core';
import { CatalogStoreService } from '../services/catalog-store.service';

@Injectable({ providedIn: 'root' })
export class BusinessAdapterService {
  constructor(private catalog: CatalogStoreService) {
    this.catalog.ensureLoaded();
  }

  adaptBusinessAdminDetails(empresa: any): any {
    if (!empresa) return empresa;

    // Precargar mapas con lo que ya venga para que getName funcione incluso antes de terminar la normalización
    this.catalog.prime('department', empresa.departments);
    this.catalog.prime('position', empresa.positions);
    this.catalog.prime('type_document', empresa.type_documents);
    this.catalog.prime('type_contract', empresa.type_contracts);
    this.catalog.prime('obligation_matrix', empresa.obligation_matrices);
    this.catalog.prime('iess', empresa.ieses);

    empresa.departments = this.normalizeList(empresa.departments, 'department', ['name', 'department.name', 'nombre', 'title']);
    empresa.positions = this.normalizeList(empresa.positions, 'position', ['name', 'position.name', 'nombre', 'title', 'description']);
    empresa.type_documents = this.normalizeList(empresa.type_documents, 'type_document', ['name', 'typeDocument.name', 'nombre', 'description', 'title']);
    empresa.type_contracts = this.normalizeList(empresa.type_contracts, 'type_contract', ['name', 'typeContract.name', 'nombre', 'title', 'description']);
    empresa.obligation_matrices = this.normalizeList(empresa.obligation_matrices, 'obligation_matrix', ['name', 'obligationMatrix.name', 'title', 'description']);

    // Usuarios / Empleados no se tocan aquí
    return empresa;
  }

  private normalizeList(list: any, kind: string, keys: string[]): any[] {
    if (!Array.isArray(list)) return [];
    return list.map((item: any) => this.normalizeItem(item, kind, keys));
  }

  private normalizeItem(item: any, kind: string, keys: string[]): any {
    // Si es número: convertir a objeto con {id, name}
    if (typeof item === 'number') {
      const id = Number(item);
      const name = this.catalog.getName(kind, id) || `#${id}`;
      return { id, name };
    }

    // Si es string: convertir a objeto con name
    if (typeof item === 'string') {
      const s = item.trim();
      return { id: null, name: s.length > 0 ? s : 'Sin asignar' };
    }

    // Si es objeto: asegurar name con claves o con catálogo si hay id
    if (item && typeof item === 'object') {
      const currentName = this.pickFromKeys(item, keys);
      if (this.isNonEmpty(currentName)) {
        return { ...item, name: String(currentName) };
      }
      const idGuess = item?.id ?? item?.position_id ?? item?.department_id ?? item?.type_document_id ?? item?.type_contract_id ?? item?.obligation_matrix_id;
      if (idGuess != null) {
        const name = this.catalog.getName(kind, idGuess);
        if (this.isNonEmpty(name)) {
          return { ...item, id: Number(idGuess), name: String(name) };
        }
      }
      return { ...item, name: 'Sin asignar' };
    }

    // Cualquier otro tipo
    return { id: null, name: 'Sin asignar' };
  }

  private pickFromKeys(obj: any, keys: string[]): string | null {
    for (const k of keys) {
      const v = this.resolveNested(obj, k);
      if (this.isNonEmpty(v)) return String(v);
    }
    return null;
  }

  private resolveNested(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let cur: any = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  private isNonEmpty(v: any): boolean {
    return v !== undefined && v !== null && String(v).trim().length > 0;
  }
}
