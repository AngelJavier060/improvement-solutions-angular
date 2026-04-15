import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { FileService } from './services/file.service';
import { IdleTimeoutService } from './core/services/idle-timeout.service';

@Component({
  selector: 'app-root',
  template: `
    <app-notification></app-notification>
    <router-outlet></router-outlet>

    <!-- Cierre por inactividad (todas las rutas con sesión iniciada) -->
    <div *ngIf="idleTimeout.showWarning"
         style="position:fixed;bottom:0;left:0;right:0;z-index:100000;background:#1a1b21;color:#fff;
                display:flex;align-items:center;justify-content:space-between;padding:1rem 2rem;
                box-shadow:0 -4px 24px rgba(0,0,0,0.3);flex-wrap:wrap;gap:0.75rem;">
      <div style="display:flex;align-items:center;gap:1rem;">
        <span style="font-size:1.5rem;">⚠️</span>
        <div>
          <p style="margin:0;font-weight:700;font-size:0.95rem;">Sesión por expirar</p>
          <p style="margin:0;font-size:0.8rem;opacity:0.8;">
            Su sesión se cerrará en <strong>{{ idleTimeout.secondsRemaining }}</strong> segundos por inactividad.
          </p>
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;">
        <button type="button" (click)="idleTimeout.continueSession()"
                style="background:#002b7d;color:#fff;border:none;padding:0.625rem 1.5rem;
                       border-radius:0.5rem;font-weight:700;cursor:pointer;font-size:0.875rem;">
          Continuar sesión
        </button>
        <button type="button" (click)="logoutFromIdleBanner()"
                style="background:#6c0008;color:#fff;border:none;padding:0.625rem 1.5rem;
                       border-radius:0.5rem;font-weight:700;cursor:pointer;font-size:0.875rem;">
          Cerrar sesión ahora
        </button>
      </div>
    </div>
  `,
  styles: []
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Improvement Solutions';
  private navSub?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private fileService: FileService,
    public idleTimeout: IdleTimeoutService
  ) {}

  ngOnInit(): void {
    (window as any).router = this.router;
    (window as any).authService = this.authService;
    (window as any).fileService = this.fileService;

    this.navSub = this.router.events
      .pipe(filter((e: Event): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.syncIdleWithAuthState());
    this.syncIdleWithAuthState();

    console.log('AppComponent inicializado');
  }

  /**
   * Inactividad solo con sesión válida y fuera de pantallas públicas de login/QR.
   * (Mismo criterio para cualquier empresa / módulo.)
   */
  private syncIdleWithAuthState(): void {
    const path = (this.router.url || '').split('?')[0] || '';
    if (!this.authService.isLoggedIn()) {
      this.idleTimeout.stop();
      return;
    }
    if (path.startsWith('/auth/') || path.startsWith('/public/')) {
      this.idleTimeout.stop();
      return;
    }
    this.idleTimeout.start();
  }

  logoutFromIdleBanner(): void {
    this.idleTimeout.stop();
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    this.idleTimeout.stop();
  }
}
