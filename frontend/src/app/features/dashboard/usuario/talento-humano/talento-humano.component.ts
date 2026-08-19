import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BusinessContextService } from '../../../../core/services/business-context.service';
import { EmployeeService } from './services/employee.service';
import { TalentoHumanoThemeService } from './services/talento-humano-theme.service';

@Component({
  selector: 'app-talento-humano',
  templateUrl: './talento-humano.component.html',
  styleUrls: ['./talento-humano.component.scss']
})
export class TalentoHumanoComponent implements OnInit, OnDestroy {
  isCollapsed = false;
  isAttendanceExpanded = false;
  businessName = 'Improvement Solutions';
  businessRuc = '';
  isDark = false;
  private themeSub?: Subscription;

  private readonly SIDEBAR_COLLAPSED_KEY = 'talentoHumano_sidebarCollapsed';
  private readonly ATTENDANCE_EXPANDED_KEY = 'talentoHumano_attendanceExpanded';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private businessContext: BusinessContextService,
    private employeeService: EmployeeService,
    private themeService: TalentoHumanoThemeService
  ) {
    this.isDark = this.themeService.isDark;
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
    // Get RUC from route
    let r: any = this.route;
    while (r) {
      const ruc = r.snapshot?.params?.['ruc'] || r.snapshot?.params?.['businessRuc'];
      if (ruc) {
        this.businessRuc = ruc;
        break;
      }
      r = r.parent;
    }

    // Try to get business name from context
    const ctx = this.businessContext.getActiveBusiness();
    if (ctx?.name) {
      this.businessName = ctx.name;
    }
  }

  ngOnInit(): void {
    this.loadSavedState();
    this.loadBusinessInfo();
    this.themeSub = this.themeService.theme$.subscribe(theme => {
      this.isDark = theme === 'dark';
    });
  }

  ngOnDestroy(): void {
    this.themeSub?.unsubscribe();
  }

  toggleTheme(): void {
    this.themeService.toggle();
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