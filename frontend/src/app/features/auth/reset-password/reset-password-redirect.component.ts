import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-reset-password-redirect',
  standalone: true,
  template: `
    <div class="container text-center mt-5">
      <div class="spinner-border" role="status" aria-hidden="true"></div>
      <p class="mt-3">Redirigiendo…</p>
    </div>
  `
})
export class ResetPasswordRedirectComponent implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    this.router.navigate(['/auth/reset-password'], { queryParams: { token } });
  }
}
