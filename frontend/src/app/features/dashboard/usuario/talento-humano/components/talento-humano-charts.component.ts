import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TalentoHumanoStatsService, StatsAggregationDto, AgeGenderRangeDto, JobRoleDto, EducationLevelDto } from '../services/talento-humano-stats.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-talento-humano-charts',
  templateUrl: './talento-humano-charts.component.html',
  styleUrls: ['./talento-humano-charts.component.scss']
})
export class TalentoHumanoChartsComponent implements OnInit, OnDestroy {
  private pendingRender = false;

  private destroy$ = new Subject<void>();
  
  statsData: StatsAggregationDto | null = null;
  selectedBusinessId: number | 'all' = 'all';
  loading = true;
  error: string | null = null;
  
  currentBusinessId: number = 0;
  allBusinessIds: number[] = [];
  barOptions: any = {};
  genderPct: { mujeres: number; hombres: number; otros: number } = { mujeres: 0, hombres: 0, otros: 0 };
  private rucParam: string = '';
  private currentBusinessName: string = '';
  donutDiscapOptions: any = {};
  donutEducationOptions: any = {};
  pyramidOptions: any = {};
  jobRoles: JobRoleDto[] = [];
  jobRolesLoading = false;
  educationLevels: EducationLevelDto[] = [];
  educationLoading = false;

  constructor(
    private route: ActivatedRoute,
    private statsService: TalentoHumanoStatsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Obtener el RUC de la ruta (buscando en toda la jerarquía) y convertirlo a business ID
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const directRuc = params['ruc'];
      const deepRuc = this.getParamDeep('ruc');
      const ruc = directRuc || deepRuc || '';
      this.rucParam = ruc;
      if (ruc) {
        this.getBusinessIdFromRuc(ruc);
      } else {
        // Si no hay RUC en la ruta, usar un ID por defecto
        this.currentBusinessId = 1;
        this.selectedBusinessId = this.currentBusinessId;
        this.loadBusinessIds();
      }
    });
  }

  private loadJobRoleComposition(): void {
    if (!this.rucParam) return;
    this.jobRolesLoading = true;
    this.statsService.getJobRoleCompositionByRuc(this.rucParam)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles: JobRoleDto[]) => {
          this.jobRoles = roles.sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
          this.jobRolesLoading = false;
        },
        error: (err) => {
          console.error('Error cargando composición de cargos:', err);
          this.jobRoles = [];
          this.jobRolesLoading = false;
        }
      });
  }

  private loadEducationLevels(): void {
    if (!this.rucParam) return;
    this.educationLoading = true;
    this.statsService.getEducationLevelsByRuc(this.rucParam)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (levels: EducationLevelDto[]) => {
          this.educationLevels = levels;
          this.updateEducationChart();
          this.educationLoading = false;
        },
        error: (err) => {
          console.error('Error cargando niveles de educación:', err);
          this.educationLevels = [];
          this.educationLoading = false;
        }
      });
  }

  private loadAgeGenderPyramid(): void {
    if (!this.rucParam) return;
    this.statsService.getAgeGenderPyramidByRuc(this.rucParam)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ranges: AgeGenderRangeDto[]) => {
          const labels = ranges.map(r => r.label);
          const womenRaw = ranges.map(r => r.women);
          const menRaw = ranges.map(r => r.men);
          const maxVal = Math.max(0, ...womenRaw, ...menRaw);
          const safeMax = Math.max(1, maxVal); // evita min=max=0 que rompe el eje
          const women = womenRaw.map(v => -v); // lado izquierdo
          const men = menRaw; // lado derecho

          this.pyramidOptions = {
            tooltip: {
              trigger: 'axis',
              axisPointer: { type: 'shadow' },
              formatter: (params: any[]) => {
                const l = params?.[0]?.axisValue || '';
                const w = Math.abs(params?.[0]?.value || 0);
                const m = Math.abs(params?.[1]?.value || 0);
                return `${l}<br/>Mujeres: ${w}<br/>Hombres: ${m}`;
              }
            },
            grid: { left: '2%', right: '2%', top: 16, bottom: 16, containLabel: true },
            xAxis: [{
              type: 'value',
              min: -safeMax,
              max: safeMax,
              splitNumber: 8,
              axisLabel: { formatter: (v: number) => Math.abs(v), color: '#6b7280' },
              axisLine: { show: true, lineStyle: { color: '#e5e7eb' } },
              splitLine: { show: true, lineStyle: { color: '#e5e7eb' } }
            }],
            yAxis: [{ type: 'category', data: labels, axisTick: { show: false }, inverse: true, axisLabel: { color: '#6b7280' }, splitLine: { show: false } }],
            series: [
              { 
                name: 'Mujeres',
                type: 'bar',
                stack: 'total',
                data: women,
                barWidth: 22,
                itemStyle: { color: '#EC4899', borderRadius: [4, 0, 0, 4] }, // Rosa profesional
                label: { show: true, position: 'insideLeft', formatter: (p: any) => { const v = Math.abs(p.value || 0); return v === 0 ? '' : String(v); }, color: '#fff', fontWeight: 'bold' }
              },
              { 
                name: 'Hombres',
                type: 'bar',
                stack: 'total',
                data: men,
                barWidth: 22,
                itemStyle: { color: '#0EA5E9', borderRadius: [0, 4, 4, 0] }, // Sky blue profesional
                label: { show: true, position: 'insideRight', formatter: (p: any) => { const v = Math.abs(p.value || 0); return v === 0 ? '' : String(v); }, color: '#fff', fontWeight: 'bold' },
                markLine: { silent: true, symbol: 'none', data: [{ xAxis: 0 }], lineStyle: { color: '#64748B', width: 2 } }
              }
            ]
          };
        },
        error: (err) => {
          console.error('Error cargando pirámide edad/género:', err);
          this.pyramidOptions = {};
        }
      });
  }

  private getParamDeep(key: string): string | null {
    let r: any = this.route;
    while (r) {
      const v = r.snapshot?.paramMap?.get?.(key);
      if (v) return v;
      r = r.parent;
    }
    return null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getBusinessIdFromRuc(ruc: string): void {
    // Obtener el ID de la empresa basado en el RUC
    this.statsService.getBusinessByRuc(ruc)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (business: any) => {
          this.currentBusinessId = business.id || business.businessId || 1;
          this.currentBusinessName = business?.name || business?.businessName || business?.razonSocial || business?.tradeName || '';
          this.selectedBusinessId = this.currentBusinessId;
          this.loadBusinessIds();
        },
        error: (error: any) => {
          console.error('Error obteniendo empresa por RUC:', error);
          // Fallback: usar ID por defecto
          this.currentBusinessId = 1;
          this.currentBusinessName = '';
          this.selectedBusinessId = this.currentBusinessId;
          this.loadBusinessIds();
        }
      });
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

    // Si tenemos RUC, tomamos stats directas por empresa
    if (this.rucParam) {
      this.statsService.getCompanyStatsByRuc(this.rucParam)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (stats) => {
            this.statsData = {
              currentBusiness: {
                businessId: this.currentBusinessId,
                businessName: this.currentBusinessName || 'Empresa',
                businessRuc: this.rucParam,
                stats
              },
              allBusinesses: [],
              totalCombined: stats
            } as any;
            this.loading = false;
            this.scheduleRender();
            // cargar pirámide edad/género, composición de cargos y niveles de educación en paralelo
            this.loadAgeGenderPyramid();
            this.loadJobRoleComposition();
            this.loadEducationLevels();
          },
          error: (error) => {
            console.error('Error cargando estadísticas por RUC:', error);
            // Fallback al agregado si falla
            this.loadAggregatedFallback();
          }
        });
      return;
    }

    // Fallback: usar agregado cuando no hay RUC
    this.loadAggregatedFallback();
  }

  private loadAggregatedFallback(): void {
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

    // Preferir lo que viene del backend como empresa actual
    if (this.statsData.currentBusiness && this.statsData.currentBusiness.stats) {
      return {
        title: this.statsData.currentBusiness.businessName,
        data: this.statsData.currentBusiness.stats
      };
    }

    // Fallback por ID seleccionado
    if (this.selectedBusinessId !== 'all') {
      const business = this.statsData.allBusinesses.find(b => b.businessId === this.selectedBusinessId);
      if (business) {
        return { title: business.businessName, data: business.stats };
      }
    }

    // Último recurso: agregado total
    return { title: 'Todas las Empresas', data: this.statsData.totalCombined };
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
    if (this.statsData.currentBusiness?.stats) return this.statsData.currentBusiness.stats;
    if (this.selectedBusinessId !== 'all') {
      const business = this.statsData.allBusinesses.find(b => b.businessId === this.selectedBusinessId);
      if (business) return business.stats;
    }
    return this.statsData.totalCombined;
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

  private updateChartOptions(): void {
    const chartData = this.getChartData();
    if (!chartData) {
      this.barOptions = {};
      this.genderPct = { mujeres: 0, hombres: 0, otros: 0 };
      return;
    }
    const categories = ['Hombres', 'Mujeres', 'Personas con Discapacidad'];
    const values = [
      chartData.data.hombres,
      chartData.data.mujeres,
      chartData.data.discapacidad
    ];
    // Paleta profesional mejorada
    const colors = ['#0EA5E9', '#EC4899', '#8B5CF6']; // Sky blue, Rosa, Violeta

    // Compute percentages: Mujeres, Hombres, Discapacidad (otros)
    const total = Number(chartData.data.total) || 0;
    if (total > 0) {
      const hombresBase = (Number(chartData.data.hombres) || 0) / total; // 0..1
      const mujeresBase = (Number(chartData.data.mujeres) || 0) / total; // 0..1
      const discBase = (Number(chartData.data.discapacidad) || 0) / total; // 0..1

      // Repartimos la porción no-discapacidad entre hombres/mujeres manteniendo su proporción
      const remain = Math.max(0, 1 - discBase);
      const hombresPct = Math.round(hombresBase * remain * 100);
      const mujeresPct = Math.round(mujeresBase * remain * 100);
      let otrosPct = Math.round(discBase * 100);

      // Ajuste por redondeo para sumar 100
      const sum = hombresPct + mujeresPct + otrosPct;
      if (sum !== 100) {
        otrosPct = Math.max(0, 100 - hombresPct - mujeresPct);
      }

      this.genderPct = { mujeres: mujeresPct, hombres: hombresPct, otros: otrosPct };
    } else {
      this.genderPct = { mujeres: 0, hombres: 0, otros: 0 };
    }

    this.barOptions = {
      title: {
        text: `Distribución de Personal - ${chartData.title}`,
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 'bold', color: '#1f2937' }
      },
      tooltip: {
        trigger: 'item',
        formatter: (p: any) => `${p.name}: ${p.value} empleados`
      },
      grid: { left: 56, right: 24, top: 48, bottom: 48 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { interval: 0 }
      },
      yAxis: {
        type: 'value',
        name: 'Número de Empleados',
        nameTextStyle: { color: '#6b7280', fontSize: 11 }
      },
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle: {
            color: (params: any) => colors[params.dataIndex] || '#3b82f6',
            borderRadius: [4, 4, 0, 0]
          },
          label: {
            show: true,
            position: 'top',
            fontSize: 14,
            fontWeight: 'bold',
            color: '#1f2937'
          }
        }
      ]
    };

    // --- Tile 2: Donut Discapacidad (Paleta profesional mejorada) ---
    const disc = Number(chartData.data.discapacidad) || 0;
    const totalDiscBase = Math.max(0, Number(chartData.data.total) || 0);
    const noDisc = Math.max(0, totalDiscBase - disc);
    const discPct = totalDiscBase > 0 ? Math.round((disc / totalDiscBase) * 100) : 0;
    this.donutDiscapOptions = {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { show: false },
      series: [
        {
          name: 'Discapacidad',
          type: 'pie',
          radius: ['56%', '78%'],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          data: [
            {
              value: disc,
              name: 'Con discapacidad',
              itemStyle: { color: '#8B5CF6' }, // Violeta profesional
              label: {
                show: true,
                position: 'center',
                formatter: () => `${discPct}%\nTotal ${totalDiscBase}`,
                fontSize: 16,
                fontWeight: 'bold',
                color: '#111827'
              }
            },
            { value: noDisc, name: 'Sin discapacidad', itemStyle: { color: '#E0E7FF' } }
          ]
        }
      ]
    };
  }

  private updateEducationChart(): void {
    if (!this.educationLevels || this.educationLevels.length === 0) {
      this.donutEducationOptions = {};
      return;
    }

    // Paleta de colores profesional para educación
    const educationColors = [
      '#0EA5E9', // Sky blue - Postgrado
      '#8B5CF6', // Violeta - Maestría
      '#EC4899', // Rosa - Universitario
      '#F59E0B', // Ámbar - Técnico/Tecnólogo
      '#10B981', // Esmeralda - Bachiller
      '#6366F1', // Índigo - Primaria
      '#64748B'  // Slate - Otros
    ];

    const data = this.educationLevels.map((level, index) => ({
      value: level.cantidad,
      name: level.nivel,
      itemStyle: { color: educationColors[index % educationColors.length] }
    }));

    this.donutEducationOptions = {
      tooltip: { 
        trigger: 'item', 
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        textStyle: { color: '#1F2937' }
      },
      legend: { 
        bottom: 8,
        left: 'center',
        icon: 'circle',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { 
          color: '#374151',
          fontSize: 11,
          fontWeight: 500
        },
        itemGap: 12
      },
      series: [
        {
          name: 'Nivel de Educación',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: true,
          label: { 
            show: true,
            position: 'outside',
            formatter: '{d}%',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#1F2937'
          },
          labelLine: { 
            show: true,
            length: 8,
            length2: 8,
            lineStyle: { color: '#D1D5DB' }
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          data: data
        }
      ]
    };
  }

  // Evita renders repetidos en el mismo tick y cuando todavía está cargando
  private scheduleRender(): void {
    if (this.loading || !this.statsData) return;
    if (this.pendingRender) return;
    this.pendingRender = true;
    setTimeout(() => {
      this.pendingRender = false;
      this.updateChartOptions();
    }, 0);
  }

}
