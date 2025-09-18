import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface DashboardUsuarioData {
  totalPersonal: { masculino: number; femenino: number; total: number };
  formacionAcademica: { label: string; value: number }[];
  rangoEdades: { label: string; value: number }[];
  trabajadoresResidentes: { label: string; value: number }[];
  tiposEtnias: { label: string; value: number }[];
  cargosAsignados: { label: string; value: number }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardUsuarioDataService {
  getDashboardData(): Observable<DashboardUsuarioData> {
    // Datos mock simulando respuesta del backend
    return of({
      totalPersonal: { masculino: 10, femenino: 2, total: 12 },
      formacionAcademica: [
        { label: 'BACHILLER', value: 7 },
        { label: 'SUPERIOR', value: 3 },
        { label: 'PRIMARIA', value: 1 },
        { label: 'TÉCNICO', value: 1 }
      ],
      rangoEdades: [
        { label: '< 20 años', value: 1 },
        { label: '20 a 29 años', value: 2 },
        { label: '30 a 39 años', value: 4 },
        { label: '40 a 49 años', value: 4 },
        { label: '50 a 59 años', value: 1 },
        { label: '>= 60 años', value: 0 }
      ],
      trabajadoresResidentes: [
        { label: 'FORANEO', value: 6 },
        { label: 'LOCAL', value: 5 },
        { label: 'AMAZONICO', value: 1 }
      ],
      tiposEtnias: [
        { label: 'MESTIZO', value: 12 }
      ],
      cargosAsignados: [
        { label: 'OPERADOR DE MÁQUINA', value: 2 },
        { label: 'CONDUCTOR', value: 1 },
        { label: 'ASISTENTE / AYUDANTE / AUXILIAR ADMINISTRATIVO', value: 1 },
        { label: 'AUXILIAR DE OPERADOR', value: 1 },
        { label: 'TRABAJADOR EN GENERAL', value: 3 },
        { label: 'PRESIDENTE', value: 1 },
        { label: 'SECRETARIA', value: 1 },
        { label: 'GERENTE GENERAL', value: 2 }
      ]
    });
  }
}
