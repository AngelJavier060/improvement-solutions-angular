import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessModuleService, BusinessModuleDto } from '../../../../services/business-module.service';
import { SubscriptionPlanService, SubscriptionPlan } from '../../../../services/subscription-plan.service';
import { BusinessService } from '../../../../services/business.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-suscripciones-empresa',
  templateUrl: './suscripciones-empresa.component.html',
  styleUrls: ['./suscripciones-empresa.component.scss']
})
export class SuscripcionesEmpresaComponent implements OnInit {

  businessId!: number;
  businessName = '';
  businessRuc = '';
  modules: BusinessModuleDto[] = [];
  plans: SubscriptionPlan[] = [];
  isLoading = true;
  isSuperAdmin = false;

  // Payment modal
  showPaymentModal = false;
  selectedModule: BusinessModuleDto | null = null;
  selectedPlanId: number | null = null;
  paymentMethod = 'TRANSFERENCIA';
  referenceNumber = '';
  paymentNotes = '';

  constructor(
    private route: ActivatedRoute,
    private businessModuleService: BusinessModuleService,
    private planService: SubscriptionPlanService,
    private businessService: BusinessService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isSuperAdmin = this.authService.hasRole('ROLE_SUPER_ADMIN');
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.businessId = +params['id'];
        this.loadBusiness();
        this.loadModules();
        this.loadPlans();
      }
    });
  }

  loadBusiness(): void {
    this.businessService.getById(this.businessId).subscribe({
      next: (b: any) => {
        this.businessName = b.name || '';
        this.businessRuc = b.ruc || '';
      }
    });
  }

  loadModules(): void {
    this.isLoading = true;
    this.businessModuleService.getModulesByBusiness(this.businessId).subscribe({
      next: (data) => {
        this.modules = data;
        this.isLoading = false;
      },
      error: () => {
        this.modules = [];
        this.isLoading = false;
      }
    });
  }

  loadPlans(): void {
    this.planService.getPlans().subscribe({
      next: (data) => { this.plans = data; },
      error: () => { this.plans = []; }
    });
  }

  getStatusBadge(mod: BusinessModuleDto): { label: string; class: string; icon: string } {
    if (!mod.active) return { label: 'Inactivo', class: 'bg-secondary', icon: 'fa-times-circle' };
    const status = mod.status || 'ACTIVO';
    switch (status) {
      case 'ACTIVO':
        if (mod.effectivelyActive) {
          if (this.isExpiringSoon(mod)) return { label: 'Por Vencer', class: 'bg-warning text-dark', icon: 'fa-exclamation-triangle' };
          return { label: 'Activo', class: 'bg-success', icon: 'fa-check-circle' };
        }
        return { label: 'Vencido', class: 'bg-danger', icon: 'fa-clock' };
      case 'SUSPENDIDO': return { label: 'Suspendido', class: 'bg-warning text-dark', icon: 'fa-pause-circle' };
      case 'VENCIDO': return { label: 'Vencido', class: 'bg-danger', icon: 'fa-clock' };
      case 'PENDIENTE': return { label: 'Pendiente', class: 'bg-info', icon: 'fa-hourglass-half' };
      default: return { label: status, class: 'bg-secondary', icon: 'fa-question-circle' };
    }
  }

  getDaysRemaining(mod: BusinessModuleDto): number {
    if (!mod.expirationDate) return -1;
    return Math.ceil((new Date(mod.expirationDate).getTime() - Date.now()) / 86400000);
  }

  isExpiringSoon(mod: BusinessModuleDto): boolean {
    const days = this.getDaysRemaining(mod);
    return days >= 0 && days <= 30;
  }

  getDurationLabel(months: number | null): string {
    if (!months || months === 0) return 'Ilimitado';
    if (months === 1) return '1 Mes';
    if (months < 12) return `${months} Meses`;
    if (months === 12) return '1 Año';
    return `${months} Meses`;
  }

  // ---- Payment flow ----

  openPaymentModal(mod: BusinessModuleDto): void {
    this.selectedModule = mod;
    this.selectedPlanId = null;
    this.paymentMethod = 'TRANSFERENCIA';
    this.referenceNumber = '';
    this.paymentNotes = '';
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedModule = null;
  }

  getSelectedPlan(): SubscriptionPlan | undefined {
    if (!this.selectedPlanId) return undefined;
    return this.plans.find(p => p.id === this.selectedPlanId);
  }

  submitPayment(): void {
    if (!this.selectedModule || !this.selectedPlanId) return;
    const plan = this.getSelectedPlan();
    if (!plan) return;

    const payload = {
      businessId: this.businessId,
      businessModuleId: this.selectedModule.id,
      planId: this.selectedPlanId,
      amount: plan.price,
      paymentMethod: this.paymentMethod,
      referenceNumber: this.referenceNumber || null,
      notes: this.paymentNotes || null
    };

    this.planService.createPayment(payload).subscribe({
      next: () => {
        alert('Pago registrado exitosamente. El Super Administrador confirmará la activación.');
        this.closePaymentModal();
        this.loadModules();
      },
      error: (err) => {
        alert('Error al registrar pago: ' + (err?.error?.message || err?.message));
      }
    });
  }
}
