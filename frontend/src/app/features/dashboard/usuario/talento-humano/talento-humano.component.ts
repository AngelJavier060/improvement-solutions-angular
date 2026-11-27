import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BusinessContextService } from '../../../../core/services/business-context.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EmployeeService } from './services/employee.service';
import { TalentoHumanoThemeService } from './services/talento-humano-theme.service';
import { BusinessService } from '../../../../services/business.service';

@Component({
  selector: 'app-talento-humano',
  templateUrl: './talento-humano.component.html',
  styleUrls: ['./talento-humano.component.scss']
})
export class TalentoHumanoComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  isAttendanceExpanded = false;
  businessName = '';
  businessRuc = '';
  businessLogoUrl: string | null = null;
  isDark = false;
  theme: 'light' | 'dark' | 'panel' = 'light';
  /** Fase C: Usuario consulta = solo lectura */
  isConsulta = false;
  private themeSub?: Subscription;

  private readonly SIDEBAR_COLLAPSED_KEY = 'talentoHumano_sidebarCollapsed';
  private readonly ATTENDANCE_EXPANDED_KEY = 'talentoHumano_attendanceExpanded';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private businessContext: BusinessContextService,
    private employeeService: EmployeeService,
    private themeService: TalentoHumanoThemeService,
    private authService: AuthService,
    private businessService: BusinessService
  ) {
    this.theme = this.themeService.current;
    this.isDark = this.theme === 'dark';
  }

  logout(): void {
    window.location.href = '/usuario';
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.saveSidebarState();
  }

  toggleAttendance(): void {
    this.isAttendanceExpanded = !this.isAttendanceExpanded;
    try { localStorage.setItem(this.ATTENDANCE_EXPANDED_KEY, JSON.stringify(this.isAttendanceExpanded)); } catch { }
  }

  private saveSidebarState(): void {
    try { localStorage.setItem(this.SIDEBAR_COLLAPSED_KEY, JSON.stringify(this.isCollapsed)); } catch (e) { }
  }

  private loadSavedState(): void {
    try {
      const collapsed = localStorage.getItem(this.SIDEBAR_COLLAPSED_KEY);
      this.isCollapsed = collapsed !== null ? JSON.parse(collapsed) : false;
      const att = localStorage.getItem(this.ATTENDANCE_EXPANDED_KEY);
      this.isAttendanceExpanded = att !== null ? JSON.parse(att) : false;
    } catch { this.isCollapsed = false; this.isAttendanceExpanded = false; }
  }

  private loadBusinessInfo(): void {
    let r: any = this.route;
    while (r) {
      const ruc = r.snapshot?.params?.['ruc'] || r.snapshot?.params?.['businessRuc'];
      if (ruc) {
        this.businessRuc = String(ruc);
        break;
      }
      r = r.parent;
    }

    const ctx = this.businessContext.getActiveBusiness();
    const ruc = this.businessRuc || (ctx?.ruc ? String(ctx.ruc) : '');
    if (!this.businessRuc && ruc) this.businessRuc = ruc;
    if (ctx?.name && ctx.ruc && String(ctx.ruc) === this.businessRuc) {
      this.businessName = ctx.name;
    }
    if (!ruc) return;

    this.businessService.getByRuc(ruc).subscribe({
      next: (b) => this.applyBusiness(b),
      error: () => {
        if (ctx?.id && String(ctx.ruc) === ruc) {
          this.businessService.getById(ctx.id).subscribe({
            next: (b) => this.applyBusiness(b)
          });
        }
      }
    });
  }

  private applyBusiness(b: { name?: string; logo?: string } | null): void {
    if (b?.name) this.businessName = b.name;
    this.businessLogoUrl = this.resolveLogo(b?.logo || '');
  }

  private resolveLogo(raw: string): string | null {
    const value = (raw || '').trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('logos/')) return `/api/files/${value}`;
    if (value.startsWith('uploads/')) return `/api/files/${value.replace(/^uploads\//, '')}`;
    return `/api/files/logos/${value}`;
  }

  ngOnInit(): void {
    this.isConsulta = this.authService.isConsultaUser();
    this.loadSavedState();
    this.loadBusinessInfo();
    this.themeSub = this.themeService.theme$.subscribe(theme => {
      this.theme = theme;
      this.isDark = theme === 'dark';
    });
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  setTheme(theme: 'light' | 'dark' | 'panel'): void {
    this.themeService.set(theme);
  }

  isDocumentosCertificacionesActive(): boolean {
    return (this.router.url || '').includes('/talento-humano/employee');
  }

  openDocumentosCertificaciones(event?: Event): void {
    event?.preventDefault();
    if (!this.businessRuc) this.loadBusinessInfo();
    if (!this.businessRuc) return;
    this.employeeService.getEmployeesByBusinessRuc(this.businessRuc).subscribe({
      next: (employees) => {
        const first = (employees || []).find(e => !!e?.cedula);
        if (first?.cedula) {
          this.router.navigate(
            ['/usuario', this.businessRuc, 'talento-humano', 'employee', first.cedula],
            { queryParams: { tab: 'employees' } }
          );
        }
      }
    });
  }
}