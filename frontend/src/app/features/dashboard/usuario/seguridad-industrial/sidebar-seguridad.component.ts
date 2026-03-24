import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar-seguridad',
  templateUrl: './sidebar-seguridad.component.html',
  styleUrls: ['./sidebar-seguridad.component.scss']
})
export class SidebarSeguridadComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  /** Submenú Indicadores Reactivos expandido */
  indicadoresExpanded = true;
  /** True si la URL actual está bajo indicadores-reactivos */
  indicadoresSectionActive = false;

  private navSub?: Subscription;
  private prefKey: string = 'si_indicadoresExpanded_default';

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.initPrefKey();
    this.loadExpandedPreference();
    this.syncFromUrl(this.router.url);
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.syncFromUrl(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  private syncFromUrl(url: string): void {
    const inSection = url.includes('/indicadores-reactivos');
    this.indicadoresSectionActive = inSection;
    // Respetar preferencia del usuario; no forzar expandir al navegar
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  toggleIndicadores(): void {
    this.indicadoresExpanded = !this.indicadoresExpanded;
    this.saveExpandedPreference();
  }

  /** Al entrar al módulo, mantener el submenú desplegable */
  expandIndicadores(): void {
    this.indicadoresExpanded = true;
    this.saveExpandedPreference();
  }

  toggleIndicadoresChevron(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleIndicadores();
  }

  private initPrefKey(): void {
    try {
      const u: any = this.authService.getCurrentUser();
      const id = (u?.email || u?.username || u?.name || 'anon').toString();
      this.prefKey = `si_indicadoresExpanded_${id}`;
    } catch {
      this.prefKey = 'si_indicadoresExpanded_default';
    }
  }

  private loadExpandedPreference(): void {
    try {
      const raw = localStorage.getItem(this.prefKey);
      if (raw === 'true' || raw === 'false') {
        this.indicadoresExpanded = (raw === 'true');
      }
    } catch { /* ignore */ }
  }

  private saveExpandedPreference(): void {
    try { localStorage.setItem(this.prefKey, String(this.indicadoresExpanded)); } catch { /* ignore */ }
  }
}
