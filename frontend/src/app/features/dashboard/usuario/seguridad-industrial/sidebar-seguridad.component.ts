import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';

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

  constructor(private router: Router) {}

  ngOnInit(): void {
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
    if (inSection) {
      this.indicadoresExpanded = true;
    }
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  toggleIndicadores(): void {
    this.indicadoresExpanded = !this.indicadoresExpanded;
  }

  /** Al entrar al módulo, mantener el submenú desplegable */
  expandIndicadores(): void {
    this.indicadoresExpanded = true;
  }

  toggleIndicadoresChevron(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleIndicadores();
  }
}
