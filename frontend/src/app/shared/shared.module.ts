import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { LoginModalComponent } from './components/login-modal/login-modal.component';
import { TestimonioCardComponent } from './components/testimonio-card/testimonio-card.component';
import { ForgotPasswordModalComponent } from './components/forgot-password-modal/forgot-password-modal.component';
import { NotificationComponent } from './components/notification/notification.component';
import { BusinessFilesComponent } from './components/business-files/business-files.component';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { FileViewerComponent } from './components/file-viewer/file-viewer.component';
import { SafePipe } from '../pipes/safe.pipe';

@NgModule({
  declarations: [
    LoginModalComponent,
    TestimonioCardComponent,
    ForgotPasswordModalComponent,
    NotificationComponent,
    BusinessFilesComponent,
    FileUploadComponent,
    FileViewerComponent,
    SafePipe
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
    NotificationComponent,
    BusinessFilesComponent,
    FileUploadComponent,
    FileViewerComponent,
    SafePipe
  ]
})
export class SharedModule { }