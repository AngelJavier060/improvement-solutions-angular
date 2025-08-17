import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { LoginModalComponent } from './components/login-modal/login-modal.component';
import { TestimonioCardComponent } from './components/testimonio-card/testimonio-card.component';
import { ForgotPasswordModalComponent } from './components/forgot-password-modal/forgot-password-modal.component';
import { NotificationComponent } from './components/notification/notification.component';

@NgModule({
  declarations: [
    LoginModalComponent,
    TestimonioCardComponent,
    ForgotPasswordModalComponent,
    NotificationComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule
  ],
  exports: [
    CommonModule,
    RouterModule,
    NgbModule,    
    LoginModalComponent,
    TestimonioCardComponent,
    ForgotPasswordModalComponent,
    NotificationComponent
  ]
})
export class SharedModule { }