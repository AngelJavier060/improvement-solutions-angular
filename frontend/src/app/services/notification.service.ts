import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timeout?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new BehaviorSubject<Notification | null>(null);
  private defaultTimeout = 5000; // 5 segundos

  constructor() { }

  /**
   * Obtiene el observable para escuchar notificaciones
   */
  public get notifications(): Observable<Notification | null> {
    return this.notificationSubject.asObservable();
  }

  /**
   * Muestra una notificación
   */
  public show(notification: Notification): void {
    // Asignar timeout por defecto si no se especificó
    if (!notification.timeout) {
      notification.timeout = this.defaultTimeout;
    }
    this.notificationSubject.next(notification);
    
    // Limpiar notificación después del timeout
    setTimeout(() => {
      this.clear();
    }, notification.timeout);
  }

  /**
   * Muestra una notificación de éxito
   */
  public success(message: string, timeout?: number): void {
    this.show({ message, type: 'success', timeout });
  }

  /**
   * Muestra una notificación de error
   */
  public error(message: string, timeout?: number): void {
    this.show({ message, type: 'error', timeout });
  }

  /**
   * Muestra una notificación informativa
   */
  public info(message: string, timeout?: number): void {
    this.show({ message, type: 'info', timeout });
  }

  /**
   * Muestra una notificación de advertencia
   */
  public warning(message: string, timeout?: number): void {
    this.show({ message, type: 'warning', timeout });
  }

  /**
   * Limpia la notificación actual
   */
  public clear(): void {
    this.notificationSubject.next(null);
  }
}
