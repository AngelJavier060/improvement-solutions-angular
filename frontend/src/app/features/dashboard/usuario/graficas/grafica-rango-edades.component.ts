import { Component, Input, OnChanges, ElementRef, SimpleChanges, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-grafica-rango-edades',
  templateUrl: './grafica-rango-edades.component.html',
  styleUrls: ['./grafica-rango-edades.component.scss']
})
export class GraficaRangoEdadesComponent implements OnChanges, AfterViewInit {
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
    // Aquí irá el código D3.js para la gráfica de pastel
    // Por ahora solo placeholder
    const container = this.el.nativeElement.querySelector('.grafica-rango-edades');
    if (container) {
      container.innerHTML = `<div style='font-size:1.2rem;'>[Gráfica de pastel de rango de edades]</div>`;
    }
  }
}
