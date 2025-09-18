import { Component, Input, OnChanges, ElementRef, SimpleChanges, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-grafica-trabajadores-residentes',
  templateUrl: './grafica-trabajadores-residentes.component.html',
  styleUrls: ['./grafica-trabajadores-residentes.component.scss']
})
export class GraficaTrabajadoresResidentesComponent implements OnChanges, AfterViewInit {
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
    // Aquí irá el código D3.js para la gráfica donut
    // Por ahora solo placeholder
    const container = this.el.nativeElement.querySelector('.grafica-trabajadores-residentes');
    if (container) {
      container.innerHTML = `<div style='font-size:1.2rem;'>[Gráfica donut de trabajadores residentes]</div>`;
    }
  }
}
