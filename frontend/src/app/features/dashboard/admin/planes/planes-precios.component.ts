import { Component, OnInit } from '@angular/core';
import { SubscriptionPlanService, SubscriptionPlan, Payment } from '../../../../services/subscription-plan.service';

@Component({
  selector: 'app-planes-precios',
  templateUrl: './planes-precios.component.html',
  styleUrls: ['./planes-precios.component.scss']
})
export class PlanesPreciosComponent implements OnInit {

  plans: SubscriptionPlan[] = [];
  pendingPayments: Payment[] = [];
  allPayments: Payment[] = [];

  isLoading = true;
  activeTab: 'planes' | 'pagos-pendientes' | 'historial' = 'planes';

  // Modal state
  showPlanModal = false;
  editingPlan: SubscriptionPlan | null = null;
  planForm: SubscriptionPlan = this.getEmptyPlan();

  constructor(private planService: SubscriptionPlanService) {}

  ngOnInit(): void {
    this.loadPlans();
    this.loadPendingPayments();
  }

  private getEmptyPlan(): SubscriptionPlan {
    return {
      code: '',
      name: '',
      description: '',
      durationMonths: 1,
      price: 0,
      currency: 'USD',
      active: true,
      displayOrder: 0
    };
  }

  loadPlans(): void {
    this.isLoading = true;
    this.planService.getPlans(true).subscribe({
      next: (data) => {
        this.plans = data;
        this.isLoading = false;
      },
      error: () => {
        this.plans = [];
        this.isLoading = false;
      }
    });
  }

  loadPendingPayments(): void {
    this.planService.getPayments(undefined, 'PENDIENTE').subscribe({
      next: (data) => { this.pendingPayments = data; },
      error: () => { this.pendingPayments = []; }
    });
  }

  loadAllPayments(): void {
    this.planService.getPayments().subscribe({
      next: (data) => { this.allPayments = data; },
      error: () => { this.allPayments = []; }
    });
  }

  setTab(tab: 'planes' | 'pagos-pendientes' | 'historial'): void {
    this.activeTab = tab;
    if (tab === 'historial' && this.allPayments.length === 0) {
      this.loadAllPayments();
    }
  }

  // ---- Plan CRUD ----

  openNewPlanModal(): void {
    this.editingPlan = null;
    this.planForm = this.getEmptyPlan();
    this.planForm.displayOrder = this.plans.length + 1;
    this.showPlanModal = true;
  }

  openEditPlanModal(plan: SubscriptionPlan): void {
    this.editingPlan = plan;
    this.planForm = { ...plan };
    this.showPlanModal = true;
  }

  closePlanModal(): void {
    this.showPlanModal = false;
    this.editingPlan = null;
  }

  savePlan(): void {
    if (this.editingPlan && this.editingPlan.id) {
      this.planService.updatePlan(this.editingPlan.id, this.planForm).subscribe({
        next: () => {
          this.loadPlans();
          this.closePlanModal();
        },
        error: (err) => { alert('Error al actualizar plan: ' + (err?.error || err?.message)); }
      });
    } else {
      this.planService.createPlan(this.planForm).subscribe({
        next: () => {
          this.loadPlans();
          this.closePlanModal();
        },
        error: (err) => { alert('Error al crear plan: ' + (err?.error || err?.message)); }
      });
    }
  }

  deletePlan(plan: SubscriptionPlan): void {
    if (!plan.id) return;
    if (!confirm(`¿Eliminar el plan "${plan.name}"?`)) return;
    this.planService.deletePlan(plan.id).subscribe({
      next: () => { this.loadPlans(); },
      error: (err) => { alert('Error al eliminar: ' + (err?.error || err?.message)); }
    });
  }

  togglePlanActive(plan: SubscriptionPlan): void {
    if (!plan.id) return;
    const updated = { ...plan, active: !plan.active };
    this.planService.updatePlan(plan.id, updated).subscribe({
      next: () => { this.loadPlans(); },
      error: () => {}
    });
  }

  // ---- Payment actions ----

  confirmPayment(payment: Payment): void {
    if (!payment.id) return;
    if (!confirm('¿Confirmar este pago? El módulo se activará automáticamente.')) return;
    this.planService.confirmPayment(payment.id).subscribe({
      next: () => {
        this.loadPendingPayments();
        this.loadAllPayments();
      },
      error: (err) => { alert('Error: ' + (err?.error?.message || err?.message)); }
    });
  }

  rejectPayment(payment: Payment): void {
    if (!payment.id) return;
    const reason = prompt('Motivo del rechazo:');
    if (reason === null) return;
    this.planService.rejectPayment(payment.id, reason).subscribe({
      next: () => {
        this.loadPendingPayments();
        this.loadAllPayments();
      },
      error: (err) => { alert('Error: ' + (err?.error?.message || err?.message)); }
    });
  }

  getDurationLabel(months: number): string {
    if (months === 0) return 'Ilimitado';
    if (months === 1) return '1 Mes';
    if (months < 12) return `${months} Meses`;
    if (months === 12) return '1 Año';
    return `${months} Meses`;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'CONFIRMADO': return 'bg-success';
      case 'PENDIENTE': return 'bg-warning text-dark';
      case 'RECHAZADO': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}
