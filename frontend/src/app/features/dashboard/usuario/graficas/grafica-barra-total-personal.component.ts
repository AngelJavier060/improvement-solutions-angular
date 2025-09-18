import { Component, Input, OnChanges, ElementRef, SimpleChanges, AfterViewInit } from '@angular/core';
import * as d3 from 'd3';

interface PersonaBarData {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-grafica-barra-total-personal',
  templateUrl: './grafica-barra-total-personal.component.html',
  styleUrls: ['./grafica-barra-total-personal.component.scss']
})
export class GraficaBarraTotalPersonalComponent implements OnChanges, AfterViewInit {
  @Input() data!: { masculino: number; femenino: number; discapacitado: number };

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
    const container = this.el.nativeElement.querySelector('.grafica-barra-total-personal');
    if (!container || !this.data) return;
    container.innerHTML = '';

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = 320 - margin.left - margin.right;
    const height = 220 - margin.top - margin.bottom;

    const datos: PersonaBarData[] = [
      { label: 'Hombres', value: this.data.masculino, color: '#2563eb' },
      { label: 'Mujeres', value: this.data.femenino, color: '#e11d48' },
      { label: 'Discapacitado', value: this.data.discapacitado ?? 0, color: '#10b981' }
    ];

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand<string>()
      .domain(datos.map(d => d.label))
      .range([0, width])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, Math.max(...datos.map(d => d.value)) * 1.2])
      .range([height, 0]);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5));

    svg.selectAll<SVGRectElement, PersonaBarData>('.bar')
      .data(datos)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d: PersonaBarData) => x(d.label)!)
      .attr('y', (d: PersonaBarData) => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', (d: PersonaBarData) => height - y(d.value))
      .attr('fill', (d: PersonaBarData) => d.color)
      .attr('rx', 6);

    svg.selectAll<SVGTextElement, PersonaBarData>('.label')
      .data(datos)
      .enter()
      .append('text')
      .attr('x', (d: PersonaBarData) => x(d.label)! + x.bandwidth() / 2)
      .attr('y', (d: PersonaBarData) => y(d.value) - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#222')
      .attr('font-size', '1rem')
      .attr('font-weight', 'bold')
      .text((d: PersonaBarData) => d.value);
  }
}
