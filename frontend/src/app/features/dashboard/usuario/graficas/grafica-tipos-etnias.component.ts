import { Component, Input, OnChanges, ElementRef, SimpleChanges, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-grafica-tipos-etnias',
  templateUrl: './grafica-tipos-etnias.component.html',
  styleUrls: ['./grafica-tipos-etnias.component.scss']
})
export class GraficaTiposEtniasComponent implements OnChanges, AfterViewInit {
  @Input() data!: { label: string; value: number }[];

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
    // Aquí irá el código D3.js para la gráfica de barras
    // Por ahora solo placeholder
    const container = this.el.nativeElement.querySelector('.grafica-tipos-etnias');
    if (container) {
      container.innerHTML = `<div style='font-size:1.2rem;'>[Gráfica de barras de tipos de etnias]</div>`;
    }
  }
}
