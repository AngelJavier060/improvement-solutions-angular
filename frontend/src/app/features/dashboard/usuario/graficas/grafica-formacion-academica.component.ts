import { Component, Input, OnChanges, ElementRef, SimpleChanges, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-grafica-formacion-academica',
  templateUrl: './grafica-formacion-academica.component.html',
  styleUrls: ['./grafica-formacion-academica.component.scss']
})
export class GraficaFormacionAcademicaComponent implements OnChanges, AfterViewInit {
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
    const container = this.el.nativeElement.querySelector('.grafica-formacion-academica');
    if (container) {
      container.innerHTML = `<div style='font-size:1.2rem;'>[Gráfica de barras de formación académica]</div>`;
    }
  }
}
