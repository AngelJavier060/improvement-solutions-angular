import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { BusinessFilesPageComponent } from './business-files-page.component';

@NgModule({
  declarations: [
    BusinessFilesPageComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild([
      {
        path: 'files',
        component: BusinessFilesPageComponent
      }
    ])
  ]
})
export class BusinessModule { }
