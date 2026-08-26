import { Directive, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

/**
 * Estructural: muestra el elemento solo si el usuario puede escribir (Fase C).
 * Uso: &lt;button *appCanWrite (click)="..."&gt;Nuevo&lt;/button&gt;
 */
@Directive({
  selector: '[appCanWrite]',
  standalone: true
})
export class CanWriteDirective implements OnInit {
  constructor(
    private templateRef: TemplateRef<unknown>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (this.authService.canWrite()) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
