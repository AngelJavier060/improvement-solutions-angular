import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApprovalService } from '../../../../services/approval.service';

@Component({
  selector: 'app-approvals-list',
  templateUrl: './approvals-list.component.html'
})
export class ApprovalsListComponent implements OnInit {
  businessId!: number;
  approvals: any[] = [];
  loading = false;
  error: string | null = null;
  private readonly pendingStatuses = new Set(['PENDING','CREATED','REQUESTED','WAITING','NEW','OPEN','PENDIENTE','EN_REVISION']);

  // Filtros
  status: string = 'ALL'; // PENDING | APPROVED | REJECTED | ALL
  type: string = 'ALL'; // MATRIX_UPDATE | FILE_UPLOAD | ALL
  targetId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private approvalService: ApprovalService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = Number(params['id']);
      if (!id) {
        this.error = 'ID de empresa inválido';
        return;
      }
      this.businessId = id;
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    this.error = null;
    const statusParam = this.status === 'ALL' ? undefined : this.status;
    this.approvalService.listByBusiness(this.businessId, statusParam).subscribe({
      next: (data) => {
        // Aceptar array directo o respuestas paginadas/objeto
        let list: any[] = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray((data as any).content)) list = (data as any).content;
        else if (data && Array.isArray((data as any).items)) list = (data as any).items;
        else if (data && Array.isArray((data as any).data)) list = (data as any).data;
        else list = [];
        // Filtro adicional por tipo y targetId si aplica
        if (this.type !== 'ALL') {
          list = list.filter(x => String(x?.type || '').toUpperCase() === this.type);
        }
        if (this.targetId.trim().length > 0) {
          list = list.filter(x => String(x?.targetId || '').includes(this.targetId.trim()));
        }
        this.approvals = list;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar aprobaciones:', err);
        this.error = 'No se pudieron cargar las solicitudes.';
        this.loading = false;
      }
    });
  }

  refresh(): void {
    this.load();
  }

  approve(req: any): void {
    if (!req?.id) return;
    this.approvalService.approve(Number(req.id)).subscribe({
      next: () => {
        this.load();
        alert('Solicitud aprobada y aplicada.');
      },
      error: (err) => {
        console.error('Error al aprobar solicitud:', err);
        alert('No se pudo aprobar la solicitud.');
      }
    });
  }

  reject(req: any): void {
    if (!req?.id) return;
    this.approvalService.reject(Number(req.id)).subscribe({
      next: () => {
        this.load();
        alert('Solicitud rechazada.');
      },
      error: (err) => {
        console.error('Error al rechazar solicitud:', err);
        alert('No se pudo rechazar la solicitud.');
      }
    });
  }

  canDecide(req: any): boolean {
    const st = (req?.status ?? req?.state ?? req?.approvalStatus ?? '').toString().toUpperCase();
    return this.pendingStatuses.has(st);
  }
}
