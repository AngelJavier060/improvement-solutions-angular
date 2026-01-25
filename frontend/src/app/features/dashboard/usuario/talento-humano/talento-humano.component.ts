import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BusinessContextService } from '../../../../core/services/business-context.service';

@Component({
  selector: 'app-talento-humano',
  templateUrl: './talento-humano.component.html',
  styleUrls: ['./talento-humano.component.scss']
})
export class TalentoHumanoComponent implements OnInit {
  isCollapsed = true;
  isMenuExpanded = false;
  businessName = 'Improvement Solutions';
  businessRuc = '';

  private readonly SIDEBAR_COLLAPSED_KEY = 'talentoHumano_sidebarCollapsed';
  private readonly MENU_EXPANDED_KEY = 'talentoHumano_menuExpanded';

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

  toggleMenu(): void {
    this.isMenuExpanded = !this.isMenuExpanded;
    this.saveMenuState();
  }

  private saveSidebarState(): void {
    try {
      localStorage.setItem(this.SIDEBAR_COLLAPSED_KEY, JSON.stringify(this.isCollapsed));
    } catch (e) { /* ignore */ }
  }

  private saveMenuState(): void {
    try {
      localStorage.setItem(this.MENU_EXPANDED_KEY, JSON.stringify(this.isMenuExpanded));
    } catch (e) { /* ignore */ }
  }

  private loadSavedState(): void {
    // Requisito: el menú lateral debe permanecer recogido por defecto
    // Forzar estado inicial (y persistirlo) a colapsado/recogido
    this.isCollapsed = true;
    this.isMenuExpanded = false;
    try {
      localStorage.setItem(this.SIDEBAR_COLLAPSED_KEY, JSON.stringify(this.isCollapsed));
      localStorage.setItem(this.MENU_EXPANDED_KEY, JSON.stringify(this.isMenuExpanded));
    } catch { /* ignore */ }
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