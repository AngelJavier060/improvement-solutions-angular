import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-matriz-legal-usuario',
  template: `
    <div class="card shadow-sm border-0">
      <div class="card-header d-flex align-items-center justify-content-between bg-white">
        <div class="d-flex align-items-center gap-2">
          <div class="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style="width:36px;height:36px;">
            <i class="fas fa-balance-scale"></i>
          </div>
          <div>
            <h5 class="mb-0 fw-bold text-dark">Matriz Legal</h5>
            <small class="text-muted">Seguridad Industrial</small>
          </div>
        </div>
        <button class="btn btn-success btn-sm">
          <i class="fas fa-plus me-1"></i>Agregar
        </button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th class="px-3">Nº</th>
                <th>Cumplimiento</th>
                <th>Normativa</th>
                <th>Detalle</th>
                <th class="text-center">Fecha registro</th>
                <th class="text-center">Fecha expiración</th>
                <th class="text-center">D. Vig</th>
                <th>Observaciones</th>
                <th>Documentos</th>
                <th class="text-end"></th>
              </tr>
            </thead>
            <tbody>
              <!-- Placeholder de ejemplo visual (reemplazar con binding real cuando esté el endpoint) -->
              <tr>
                <td class="px-3">1</td>
                <td>ALTO</td>
                <td>Decreto 255</td>
                <td>Comité Paritario</td>
                <td class="text-center">2025-09-01</td>
                <td class="text-center">2026-09-01</td>
                <td class="text-center">350</td>
                <td>—</td>
                <td>
                  <div class="d-flex gap-2 fs-5">
                    <i class="fas fa-file-pdf text-danger"></i>
                    <i class="fas fa-file-word text-primary"></i>
                    <button class="btn btn-link text-success p-0" title="Agregar documento">
                      <i class="fas fa-plus"></i>
                    </button>
                  </div>
                </td>
                <td class="text-end">
                  <button class="btn btn-link text-primary">Editar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class MatrizLegalUsuarioComponent implements OnInit {
  ngOnInit(): void {}
}
