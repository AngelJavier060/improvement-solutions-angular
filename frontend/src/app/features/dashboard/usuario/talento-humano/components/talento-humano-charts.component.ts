import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as d3 from 'd3';
import { TalentoHumanoStatsService, StatsAggregationDto } from '../services/talento-humano-stats.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-talento-humano-charts',
  templateUrl: './talento-humano-charts.component.html',
  styleUrls: ['./talento-humano-charts.component.scss']
})
export class TalentoHumanoChartsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;
  private resizeObserver: ResizeObserver | null = null;
  private pendingRender = false;

  private destroy$ = new Subject<void>();
  
  statsData: StatsAggregationDto | null = null;
  selectedBusinessId: number | 'all' = 'all';
  loading = true;
  error: string | null = null;
  
  currentBusinessId: number = 0;
  allBusinessIds: number[] = [];

  constructor(
    private route: ActivatedRoute,
    private statsService: TalentoHumanoStatsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener el RUC de la ruta y convertirlo a business ID
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const ruc = params['ruc'];
      if (ruc) {
        this.getBusinessIdFromRuc(ruc);
      } else {
        // Si no hay RUC en la ruta, usar un ID por defecto
        this.currentBusinessId = 1;
        this.loadBusinessIds();
      }
    });
  }

  ngAfterViewInit(): void {
    // Redibujar cuando cambie el tamaño del contenedor
    try {
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.scheduleRender());
        this.resizeObserver.observe(this.chartContainer.nativeElement);
      } else {
        window.addEventListener('resize', this.handleResize);
      }
    } catch {
      window.addEventListener('resize', this.handleResize);
    }
  }

  private getBusinessIdFromRuc(ruc: string): void {
    // Obtener el ID de la empresa basado en el RUC
    this.statsService.getBusinessByRuc(ruc)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (business: any) => {
          this.currentBusinessId = business.id || business.businessId || 1;
          this.loadBusinessIds();
        },
        error: (error: any) => {
          console.error('Error obteniendo empresa por RUC:', error);
          // Fallback: usar ID por defecto
          this.currentBusinessId = 1;
          this.loadBusinessIds();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this.handleResize);
  }

  private loadBusinessIds(): void {
    // Obtener empresas asociadas al usuario desde el backend
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id;
    if (!userId) {
      // Fallback: sólo empresa actual
      this.allBusinessIds = [this.currentBusinessId];
      this.loadStats();
      return;
    }
    this.statsService.getUserBusinessesByUserId(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (businesses) => {
          const fromUser: number[] = businesses.map(b => b.id || b.businessId).filter((v: any) => !!v);
          // Unir siempre la empresa actual
          const merged = [...fromUser, this.currentBusinessId];
          // Quitar duplicados
          this.allBusinessIds = Array.from(new Set(merged));
          this.loadStats();
        },
        error: (error) => {
          console.error('Error cargando empresas del usuario:', error);
          // Fallback: usar solo la empresa actual
          this.allBusinessIds = [this.currentBusinessId];
          this.loadStats();
        }
      });
  }

  private loadStats(): void {
    this.loading = true;
    this.error = null;

    this.statsService.getAggregatedStatsByBusinessIds(this.allBusinessIds, this.currentBusinessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.statsData = data;
          this.loading = false;
          this.scheduleRender();
        },
        error: (error) => {
          console.error('Error cargando estadísticas:', error);
          this.error = 'Error al cargar las estadísticas. Por favor, inténtelo de nuevo.';
          this.loading = false;
        }
      });
  }

  onBusinessChange(): void {
    this.scheduleRender();
  }

  private getChartData() {
    if (!this.statsData) return null;

    if (this.selectedBusinessId === 'all') {
      return {
        title: 'Todas las Empresas',
        data: this.statsData.totalCombined
      };
    } else {
      const business = this.statsData.allBusinesses.find(b => b.businessId === this.selectedBusinessId);
      if (business) {
        return {
          title: business.businessName,
          data: business.stats
        };
      }
    }
    return null;
  }

  getDisabilityPercentage(): string {
    const chartData = this.getChartData();
    if (!chartData || chartData.data.total === 0) return '0.0';
    return ((chartData.data.discapacidad / chartData.data.total) * 100).toFixed(1);
  }

  selectBusiness(businessId: number): void {
    this.selectedBusinessId = businessId;
    this.scheduleRender();
  }

  reloadStats(): void {
    this.loadStats();
  }

  // Métodos auxiliares para el template
  getCurrentStats() {
    if (!this.statsData) return { hombres: 0, mujeres: 0, discapacidad: 0, total: 0 };
    if (this.selectedBusinessId === 'all') {
      return this.statsData.totalCombined;
    } else {
      const business = this.statsData.allBusinesses.find(b => b.businessId === this.selectedBusinessId);
      return business ? business.stats : { hombres: 0, mujeres: 0, discapacidad: 0, total: 0 };
    }
  }

  getBusinessCount(): number {
    return this.statsData?.allBusinesses?.length || 0;
  }

  isShowingAllBusinesses(): boolean {
    return this.selectedBusinessId === 'all';
  }

  hasMultipleBusinesses(): boolean {
    return this.getBusinessCount() > 1;
  }

  getBusinessDisabilityPercentage(business: any): string {
    if (!business || !business.stats || business.stats.total === 0) return '0.0';
    return ((business.stats.discapacidad / business.stats.total) * 100).toFixed(1);
  }

  private renderChart(): void {
    const chartData = this.getChartData();
    if (!chartData) return;

    const container = this.chartContainer.nativeElement;
    container.innerHTML = '';

    const margin = { top: 28, right: 24, bottom: 48, left: 56 };
    const rect = container.getBoundingClientRect();
    // Medir ancho real del contenedor o su padre inmediato
    const rawWidth = Math.floor(
      (container.clientWidth || rect.width || container.parentElement?.clientWidth || 600)
    );
    const width = Math.max(280, rawWidth - margin.left - margin.right);
    const ratio = 9 / 16; // más compacto en vertical
    const height = Math.max(180, Math.floor(width * ratio));

    const data = [
      { label: 'Hombres', value: chartData.data.hombres, color: '#3b82f6' },
      { label: 'Mujeres', value: chartData.data.mujeres, color: '#ec4899' },
      { label: 'Personas con Discapacidad', value: chartData.data.discapacidad, color: '#10b981' }
    ];

    const svg = d3.select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Título
    svg.append('text')
      .attr('x', (width + margin.left + margin.right) / 2)
      .attr('y', 22)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1f2937')
      .text(`Distribución de Personal - ${chartData.title}`);

    // Escalas
    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, Math.max(...data.map(d => d.value)) * 1.1])
      .range([height, 0]);

    // Ejes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .style('text-anchor', 'middle')
      .attr('dy', '0.9em');

    g.append('g')
      .call(d3.axisLeft(y).ticks(5));

    // Etiqueta del eje Y
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '0.6em')
      .style('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#6b7280')
      .text('Número de Empleados');

    // Barras
    g.selectAll('.bar')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.label)!)
      .attr('y', d => y(d.value))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.value))
      .attr('fill', d => d.color)
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 0.8);
        
        // Tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'chart-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('opacity', 0);

        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(`${d.label}: ${d.value} empleados`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 1);
        d3.selectAll('.chart-tooltip').remove();
      });

    // Etiquetas de valores
    g.selectAll('.value-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('x', d => x(d.label)! + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1f2937')
      .text(d => d.value);

    // Estadísticas adicionales
    const totalEmployees = chartData.data.total;
    const statsText = g.append('g')
      .attr('transform', `translate(${width - 110}, 8)`);

    statsText.append('rect')
      .attr('width', 100)
      .attr('height', 54)
      .attr('fill', '#f9fafb')
      .attr('stroke', '#e5e7eb')
      .attr('rx', 4);

    statsText.append('text')
      .attr('x', 55)
      .attr('y', 13)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#374151')
      .text('Total Empleados');

    statsText.append('text')
      .attr('x', 55)
      .attr('y', 31)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1f2937')
      .text(totalEmployees);

    if (totalEmployees > 0) {
      const disabilityPercentage = ((chartData.data.discapacidad / totalEmployees) * 100).toFixed(1);
      statsText.append('text')
        .attr('x', 55)
        .attr('y', 48)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#6b7280')
        .text(`${disabilityPercentage}% con discapacidad`);
    }
  }

  // Evita renders repetidos en el mismo tick y cuando todavía está cargando
  private scheduleRender(): void {
    if (this.loading || !this.statsData) return;
    if (this.pendingRender) return;
    this.pendingRender = true;
    setTimeout(() => {
      this.pendingRender = false;
      this.renderChart();
    }, 0);
  }

  private handleResize = () => this.scheduleRender();
}
