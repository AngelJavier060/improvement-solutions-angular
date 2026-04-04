import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subscription, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class IdleTimeoutService implements OnDestroy {
  private readonly TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutos
  private readonly WARNING_MS = 60 * 1000;       // Aviso 1 minuto antes (a los 4 min de inactividad)

  private idleTimer: any = null;
  private warningTimer: any = null;
  private activitySub: Subscription | null = null;
  private destroy$ = new Subject<void>();

  showWarning = false;
  secondsRemaining = 60;
  private countdownInterval: any = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  /** Inicia la escucha de actividad. Llamar al hacer login o al montar el layout autenticado. */
  start(): void {
    this.stop(); // Limpiar timers previos

    const activityEvents$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'mousedown'),
      fromEvent(document, 'keydown'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'scroll'),
      fromEvent(document, 'click')
    ).pipe(debounceTime(300), takeUntil(this.destroy$));

    this.activitySub = activityEvents$.subscribe(() => this.onActivity());

    this.ngZone.runOutsideAngular(() => this.resetTimer());
  }

  /** Detiene los timers. Llamar al hacer logout o al destruir el layout. */
  stop(): void {
    this.clearTimers();
    if (this.activitySub) {
      this.activitySub.unsubscribe();
      this.activitySub = null;
    }
    this.showWarning = false;
  }

  /** Renueva la sesión desde la advertencia */
  continueSession(): void {
    this.showWarning = false;
    this.ngZone.runOutsideAngular(() => this.resetTimer());
  }

  private onActivity(): void {
    if (!this.showWarning) {
      this.ngZone.runOutsideAngular(() => this.resetTimer());
    }
  }

  private resetTimer(): void {
    this.clearTimers();

    this.warningTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.showWarning = true;
        this.secondsRemaining = 60;
        this.startCountdown();
      });
    }, this.TIMEOUT_MS - this.WARNING_MS);

    this.idleTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.logout();
      });
    }, this.TIMEOUT_MS);
  }

  private startCountdown(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      this.ngZone.run(() => {
        this.secondsRemaining--;
        if (this.secondsRemaining <= 0) {
          clearInterval(this.countdownInterval);
        }
      });
    }, 1000);
  }

  private clearTimers(): void {
    if (this.idleTimer)   { clearTimeout(this.idleTimer);    this.idleTimer = null; }
    if (this.warningTimer){ clearTimeout(this.warningTimer); this.warningTimer = null; }
    if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null; }
  }

  private logout(): void {
    this.stop();
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stop();
  }
}
