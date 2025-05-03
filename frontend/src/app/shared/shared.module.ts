import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { LoginModalComponent } from './components/login-modal/login-modal.component';
import { TestimonioCardComponent } from './components/testimonio-card/testimonio-card.component';

@NgModule({
  declarations: [
    LoginModalComponent,
    TestimonioCardComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule
  ],
  exports: [
    LoginModalComponent,
    TestimonioCardComponent
  ]
})
export class SharedModule { }