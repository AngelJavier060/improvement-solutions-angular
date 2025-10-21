import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-stock-actual',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1><i class="fas fa-boxes"></i> Stock Actual</h1>
        <p>Visualiza el inventario disponible en tiempo real</p>
      </div>
      <div class="page-content">
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <span>Esta sección está en construcción. Aquí podrás visualizar el stock actual.</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .page-header { margin-bottom: 30px; }
    .page-header h1 { font-size: 28px; font-weight: 600; color: #2c3e50; margin: 0 0 8px 0; display: flex; align-items: center; gap: 12px; }
    .page-header h1 i { color: #9b59b6; }
    .page-header p { font-size: 15px; color: #7f8c8d; margin: 0; }
    .page-content { background: #fff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }
    .alert { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-radius: 8px; background-color: #d1ecf1; border-left: 4px solid #0c5460; color: #0c5460; }
    .alert i { font-size: 20px; }
    .alert span { font-size: 15px; font-weight: 500; }
  `]
})
export class StockActualComponent implements OnInit {
  ruc: string = '';
  constructor(private route: ActivatedRoute) {}
  ngOnInit(): void { this.ruc = this.route.parent?.snapshot.params['ruc'] || ''; }
}
