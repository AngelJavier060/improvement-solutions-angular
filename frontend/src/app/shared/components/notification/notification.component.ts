import { Component, OnInit } from '@angular/core';
import { NotificationService, Notification } from '../../../services/notification.service';

@Component({
  selector: 'app-notification',
  template: `
    <div class="notification-container" *ngIf="notification">
      <div class="alert" 
        [ngClass]="{
          'alert-success': notification.type === 'success',
          'alert-danger': notification.type === 'error',
          'alert-info': notification.type === 'info',
          'alert-warning': notification.type === 'warning'
        }"
        role="alert"
      >
        <div class="d-flex align-items-center">
          <div class="me-2">
            <i class="fas" 
              [ngClass]="{
                'fa-check-circle': notification.type === 'success',
                'fa-exclamation-circle': notification.type === 'error',
                'fa-info-circle': notification.type === 'info',
                'fa-exclamation-triangle': notification.type === 'warning'
              }">
            </i>
          </div>
          <div>{{ notification.message }}</div>
          <button type="button" class="btn-close ms-auto" aria-label="Close" (click)="clearNotification()"></button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1050;
      min-width: 300px;
      max-width: 500px;
      animation: fadeIn 0.3s ease-in;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class NotificationComponent implements OnInit {
  notification: Notification | null = null;

  constructor(private notificationService: NotificationService) { }

  ngOnInit(): void {
    this.notificationService.notifications.subscribe(notification => {
      this.notification = notification;
    });
  }

  clearNotification(): void {
    this.notificationService.clear();
  }
}
