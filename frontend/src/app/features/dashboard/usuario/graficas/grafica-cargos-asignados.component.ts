import { Component, Input, OnChanges, ElementRef, SimpleChanges, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-grafica-cargos-asignados',
  templateUrl: './grafica-cargos-asignados.component.html',
  styleUrls: ['./grafica-cargos-asignados.component.scss']
})
export class GraficaCargosAsignadosComponent implements OnChanges, AfterViewInit {
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
    const container = this.el.nativeElement.querySelector('.grafica-cargos-asignados');
    if (!container) return;
    container.innerHTML = '';
    // Datos y estilos
    const width = 370;
    const height = 170;
    const barWidth = 38;
    const barGap = 28;
    const colors = ['#22b573', '#2980c3', '#ffe600', '#e74c3c', '#8e44ad'];
    const textColors = ['#22b573', '#2980c3', '#ffe600', '#e74c3c', '#8e44ad'];
    const labels = ['Ventas', 'Peticiones', 'Reclamos', 'Felicitación', 'Soporte'];
    const values = [71, 43, 71, 52, 55];
    // SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.style.display = 'block';
    svg.style.margin = '0 auto';
    // Fondo sutil
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', width.toString());
    bg.setAttribute('height', height.toString());
    bg.setAttribute('fill', 'transparent');
    svg.appendChild(bg);
    // Barras
    for (let i = 0; i < values.length; i++) {
      const x = i * (barWidth + barGap) + 18;
      const barHeight = Math.round((values[i] / 100) * 90);
      // Sombra
      const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      shadow.setAttribute('x', (x + 4).toString());
      shadow.setAttribute('y', (height - 50 - barHeight + 8).toString());
      shadow.setAttribute('width', (barWidth - 2).toString());
      shadow.setAttribute('height', (barHeight + 10).toString());
      shadow.setAttribute('fill', '#0001');
      svg.appendChild(shadow);
      // Barra principal (animada)
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('x', x.toString());
      bar.setAttribute('y', (height - 50 - barHeight).toString());
      bar.setAttribute('width', barWidth.toString());
      bar.setAttribute('height', '0');
      bar.setAttribute('fill', colors[i]);
      bar.setAttribute('rx', '7');
      svg.appendChild(bar);
      setTimeout(() => {
        bar.setAttribute('height', barHeight.toString());
        bar.setAttribute('y', (height - 50 - barHeight).toString());
      }, 100 + i * 80);
      // Tapa 3D
      const top = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      top.setAttribute('x', (x - 2).toString());
      top.setAttribute('y', (height - 50 - barHeight - 7).toString());
      top.setAttribute('width', (barWidth + 4).toString());
      top.setAttribute('height', '10');
      top.setAttribute('fill', '#222a');
      svg.appendChild(top);
      // Porcentaje
      const percent = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      percent.setAttribute('x', (x + barWidth / 2).toString());
      percent.setAttribute('y', (height - 50 - barHeight - 12).toString());
      percent.setAttribute('text-anchor', 'middle');
      percent.setAttribute('font-size', '18');
      percent.setAttribute('font-weight', 'bold');
      percent.setAttribute('fill', colors[i]);
      percent.style.textShadow = '0 1px 2px #fff, 0 0 2px #0002';
      percent.textContent = values[i] + '%';
      svg.appendChild(percent);
      // Etiqueta
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', (x + barWidth / 2).toString());
      label.setAttribute('y', (height - 18).toString());
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '15');
      label.setAttribute('font-weight', '600');
      label.setAttribute('fill', '#222');
      label.style.fontFamily = 'inherit';
      label.textContent = labels[i];
      svg.appendChild(label);
    }
    container.appendChild(svg);
  }
}
