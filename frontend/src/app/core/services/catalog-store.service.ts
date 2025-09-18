import { Injectable } from '@angular/core';
import { DepartmentService } from '../../services/department.service';
import { CargoService } from '../../services/cargo.service';
import { TipoDocumentoService } from '../../services/tipo-documento.service';
import { TypeContractService } from '../../services/type-contract.service';
import { ObligationMatrixService } from '../../services/obligation-matrix.service';
import { IessService } from '../../services/iess.service';

@Injectable({ providedIn: 'root' })
export class CatalogStoreService {
  private loaded = false;

  private positionsById = new Map<number, any>();
  private departmentsById = new Map<number, any>();
  private typeDocumentsById = new Map<number, any>();
  private typeContractsById = new Map<number, any>();
  private obligationsById = new Map<number, any>();
  private iessById = new Map<number, any>();

  constructor(
    private departmentService: DepartmentService,
    private cargoService: CargoService,
    private tipoDocumentoService: TipoDocumentoService,
    private typeContractService: TypeContractService,
    private obligationMatrixService: ObligationMatrixService,
    private iessService: IessService,
  ) {}

  // Cargar una sola vez todos los catálogos
  ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;

    this.departmentService.getAllDepartments().subscribe({
      next: (items: any[]) => {
        (items || []).forEach(i => this.departmentsById.set(Number(i?.id), i));
      },
      error: () => {}
    });

    this.cargoService.getCargos().subscribe({
      next: (items: any[]) => {
        (items || []).forEach(i => this.positionsById.set(Number(i?.id), i));
      },
      error: () => {}
    });

    this.tipoDocumentoService.getTiposDocumento().subscribe({
      next: (items: any[]) => {
        (items || []).forEach(i => this.typeDocumentsById.set(Number(i?.id), i));
      },
      error: () => {}
    });

    this.typeContractService.getAllTypeContracts().subscribe({
      next: (items: any[]) => {
        (items || []).forEach(i => this.typeContractsById.set(Number(i?.id), i));
      },
      error: () => {}
    });

    this.obligationMatrixService.getObligationMatrices().subscribe({
      next: (items: any[]) => {
        (items || []).forEach(i => this.obligationsById.set(Number(i?.id), i));
      },
      error: () => {}
    });

    this.iessService.getIessItems().subscribe({
      next: (items: any[]) => {
        (items || []).forEach(i => this.iessById.set(Number(i?.id), i));
      },
      error: () => {}
    });
  }

  getName(kind: string, id: any): string | null {
    const nId = Number(id);
    if (isNaN(nId)) return null;

    const map = this.getMapByKind(kind);
    const item = map?.get(nId);
    if (!item) return null;
    return this.pickName(item);
  }

  // Precargar mapas con datos ya obtenidos (útil para resoluciones sincrónicas)
  prime(kind: string, items: any[] | null | undefined): void {
    const list = items || [];
    switch (kind) {
      case 'position':
      case 'employee-position':
        list.forEach(i => this.positionsById.set(Number(i?.id), i));
        break;
      case 'department':
      case 'employee-department':
        list.forEach(i => this.departmentsById.set(Number(i?.id), i));
        break;
      case 'type_document':
        list.forEach(i => this.typeDocumentsById.set(Number(i?.id), i));
        break;
      case 'type_contract':
        list.forEach(i => this.typeContractsById.set(Number(i?.id), i));
        break;
      case 'obligation_matrix':
        list.forEach(i => this.obligationsById.set(Number(i?.id), i));
        break;
      case 'iess':
        list.forEach(i => this.iessById.set(Number(i?.id), i));
        break;
      default:
        break;
    }
  }

  private getMapByKind(kind: string): Map<number, any> | null {
    switch (kind) {
      case 'position':
      case 'employee-position':
        return this.positionsById;
      case 'department':
      case 'employee-department':
        return this.departmentsById;
      case 'type_document':
        return this.typeDocumentsById;
      case 'type_contract':
        return this.typeContractsById;
      case 'obligation_matrix':
        return this.obligationsById;
      case 'iess':
        return this.iessById;
      default:
        return null;
    }
  }

  pickName(obj: any): string | null {
    if (!obj) return null;
    const keys = ['name', 'nombre', 'title', 'description'];
    for (const k of keys) {
      const v = obj?.[k];
      if (v !== undefined && v !== null && String(v).trim().length > 0) return String(v);
    }
    return null;
  }
}
