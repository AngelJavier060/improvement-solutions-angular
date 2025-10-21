import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

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
export class GraficaBarraTotalPersonalComponent implements OnChanges {
  @Input() data!: { masculino: number; femenino: number; discapacitado: number };

  options: any = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.updateOptions();
    }
  }

  private updateOptions(): void {
    const masculino = Number(this.data?.masculino) || 0;
    const femenino = Number(this.data?.femenino) || 0;
    const discapacitado = Number((this.data as any)?.discapacitado) || 0;

    const categories = ['Hombres', 'Mujeres', 'Discapacitado'];
    const values = [masculino, femenino, discapacitado];
    const colors = ['#2563eb', '#e11d48', '#10b981'];

    this.options = {
      tooltip: { trigger: 'item', formatter: (p: any) => `${p.name}: ${p.value}` },
      grid: { left: 40, right: 16, top: 16, bottom: 36 },
      xAxis: { type: 'category', data: categories },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle: { color: (p: any) => colors[p.dataIndex] || '#2563eb', borderRadius: [6, 6, 0, 0] },
          label: { show: true, position: 'top', fontWeight: 'bold' }
        }
      ]
    };
  }
}
