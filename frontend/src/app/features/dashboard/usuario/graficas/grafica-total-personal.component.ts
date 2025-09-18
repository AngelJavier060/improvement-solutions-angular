import { Component, Input, OnChanges, ElementRef, SimpleChanges, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-grafica-total-personal',
  templateUrl: './grafica-total-personal.component.html',
  styleUrls: ['./grafica-total-personal.component.scss']
})
export class GraficaTotalPersonalComponent implements OnChanges, AfterViewInit {
  @Input() data!: { masculino: number; femenino: number; total: number };

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && !changes['data'].firstChange) {
      this.renderChart();
    }
  }

  renderChart() {
    // Aquí irá el código D3.js para la gráfica de total de personal
    // Por ahora solo placeholder
    const container = this.el.nativeElement.querySelector('.grafica-total-personal');
    if (container) {
      container.innerHTML = `<div style='font-size:2rem;font-weight:bold;'>Total: ${this.data?.total ?? '-'}<br>Masculino: ${this.data?.masculino ?? '-'}<br>Femenino: ${this.data?.femenino ?? '-'}</div>`;
    }
  }
}
