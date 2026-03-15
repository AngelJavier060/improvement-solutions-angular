import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessContextService } from '../../../../core/services/business-context.service';

@Component({
  selector: 'app-talento-humano',
  templateUrl: './talento-humano.component.html',
  styleUrls: ['./talento-humano.component.scss']
})
export class TalentoHumanoComponent implements OnInit {
  isCollapsed = false;
  isAttendanceExpanded = false;
  businessName = 'Improvement Solutions';
  businessRuc = '';

  private readonly SIDEBAR_COLLAPSED_KEY = 'talentoHumano_sidebarCollapsed';
  private readonly ATTENDANCE_EXPANDED_KEY = 'talentoHumano_attendanceExpanded';

  constructor(
    private route: ActivatedRoute,
    private businessContext: BusinessContextService
  ) { }

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
    console.log('Módulo de Talento Humano inicializado');
  }
}