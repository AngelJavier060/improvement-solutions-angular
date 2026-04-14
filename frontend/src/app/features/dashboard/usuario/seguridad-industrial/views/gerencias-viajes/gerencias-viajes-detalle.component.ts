import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GerenciaViajeService, GerenciaViajeDto } from '../../services/gerencia-viaje.service';
import { DistanciaRecorrerService } from '../../../../../../services/distancia-recorrer.service';
import { DistanciaRecorrer } from '../../../../../../models/distancia-recorrer.model';
import { BusinessService } from '../../../../../../services/business.service';

@Component({
  selector: 'app-gerencias-viajes-detalle',
  templateUrl: './gerencias-viajes-detalle.component.html',
  styleUrls: ['./gerencias-viajes-detalle.component.scss']
})
export class GerenciasViajesDetalleComponent implements OnInit, OnDestroy {
  private static readonly PRINT_CLS = 'print-gerencia-only';

  /** Vista previa de impresión: más fiable que solo beforeprint en varios navegadores */
  private readonly onPrintMediaChange = (e: MediaQueryListEvent) => this.setGerenciaPrintMode(e.matches);

  private printMq?: MediaQueryList;
  /** Referencia estable para APIs antiguas addListener/removeListener */
  private legacyPrintMqHandler?: () => void;

  businessRuc: string = '';
  gerenciaId?: number;
  gerencia: any = null;
  loading: boolean = false;
  error: string = '';
  distancias: DistanciaRecorrer[] = [];
  private companyDetails: any = null;
  private selectedMetodologiaId: number | null = null;
  private selectedMetodologiaKey: string | null = null;
  companyName: string = '';
  companyLogoUrl: string | null = null;
  emergencyContacts: Array<{ area: string; phone: string }> = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gerenciaService: GerenciaViajeService,
    private distanciaService: DistanciaRecorrerService,
    private businessService: BusinessService
  ) {}

  ngOnInit(): void {
    try {
      this.printMq = window.matchMedia('print');
      if (typeof this.printMq.addEventListener === 'function') {
        this.printMq.addEventListener('change', this.onPrintMediaChange);
      } else {
        this.legacyPrintMqHandler = () => this.setGerenciaPrintMode(!!this.printMq?.matches);
        this.printMq.addListener(this.legacyPrintMqHandler as (ev: MediaQueryListEvent) => void);
      }
    } catch {
      /* ignore */
    }

    // Resolver RUC de la empresa desde la ruta completa (robusto en cualquier nivel)
    const rucResolved = this.resolveRucFromRouteSnapshot();
    if (rucResolved) {
      this.businessRuc = rucResolved;
      this.loadBusinessDetailsByRuc(rucResolved);
    }

    // Cargar catálogo global de Distancia a Recorrer para mapear NR automáticamente
    this.distanciaService.getAll().subscribe({
      next: (items) => {
        this.distancias = items || [];
        this.applyAutoScoresFromConfig();
      },
      error: () => {}
    });

    this.route.parent?.parent?.params.subscribe(params => {
      this.businessRuc = params['ruc'];
      if (this.businessRuc && !this.companyDetails) {
        this.loadBusinessDetailsByRuc(this.businessRuc);
      }
    });

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.gerenciaId = +params['id'];
        this.loadGerencia(this.gerenciaId);
      }
    });
  }

  ngOnDestroy(): void {
    try {
      const mq = this.printMq;
      if (mq) {
        if (typeof mq.removeEventListener === 'function') {
          mq.removeEventListener('change', this.onPrintMediaChange);
        } else if (this.legacyPrintMqHandler) {
          mq.removeListener(this.legacyPrintMqHandler as (ev: MediaQueryListEvent) => void);
        }
      }
    } catch {
      /* ignore */
    }
    this.setGerenciaPrintMode(false);
  }

  private setGerenciaPrintMode(on: boolean): void {
    const c = GerenciasViajesDetalleComponent.PRINT_CLS;
    try {
      document.documentElement.classList.toggle(c, on);
      document.body.classList.toggle(c, on);
    } catch {
      /* ignore */
    }
  }

  loadGerencia(id: number): void {
    this.loading = true;
    this.error = '';
    this.gerenciaService.getById(id).subscribe({
      next: (data) => {
        this.gerencia = data;
        this.loading = false;
        // Fallback: si aún no hemos cargado detalles de empresa, intentar usando datos de la propia gerencia
        const gAny: any = data as any;
        if (!this.companyDetails && gAny) {
          if (gAny.businessRuc) {
            this.businessRuc = gAny.businessRuc;
            this.loadBusinessDetailsByRuc(this.businessRuc);
          } else if (gAny.businessId != null && Number.isFinite(Number(gAny.businessId))) {
            const bid = Number(gAny.businessId);
            this.businessService.getDetails(bid).subscribe({
              next: (det: any) => {
                this.companyDetails = det || {};
                this.selectedMetodologiaId = this.pickMetodologiaId(det);
                const mets = Array.isArray(det?.metodologiaRiesgos) ? det.metodologiaRiesgos : [];
                const chosen = mets.find((m: any) => (m?.id ?? null) === this.selectedMetodologiaId);
                this.selectedMetodologiaKey = this.normalizeMethodName(chosen?.name ?? chosen?.nombre);
                this.emergencyContacts = this.parseEmergencyContacts(det?.emergencyContacts);
                this.applyAutoScoresFromConfig();
              },
              error: () => {}
            });
          }
        }
        this.applyAutoScoresFromConfig();
      },
      error: (err) => {
        console.error('[GerenciasViajesDetalle] Error al cargar:', err);
        this.error = 'Error al cargar la gerencia de viaje';
        this.loading = false;
      }
    });
  }

  imprimir(): void {
    /* matchMedia('print') aplica la clase al abrir la vista previa; refuerzo por si el navegador tarda */
    this.setGerenciaPrintMode(true);
    setTimeout(() => window.print(), 0);
  }

  volver(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  editar(): void {
    this.router.navigate(['..', this.gerenciaId, 'editar'], { relativeTo: this.route });
  }

  getRiskColor(nivel: string | null | undefined): string {
    switch ((nivel || '').toString().toUpperCase()) {
      case 'IV':
      case 'BAJO':
        return '#90EE90'; // Verde
      case 'III':
      case 'MEDIO-BAJO':
        return '#FFD700'; // Amarillo
      case 'II':
      case 'MEDIO':
        return '#FFA500'; // Naranja
      case 'I':
      case 'ALTO':
        return '#FF4C4C'; // Rojo
      default:
        return '#f2f2f2';
    }
  }

  getScoreColor(score: number | null | undefined): string {
    if (score == null || Number.isNaN(Number(score))) {
      return '#e9ecef';
    }
    const s = Number(score);
    if (s <= 100) return '#90EE90';
    if (s <= 200) return '#FFD700';
    if (s <= 300) return '#FFA500';
    return '#FF4C4C';
  }

  scoreFg(score: number | null | undefined): string {
    if (score == null || Number.isNaN(Number(score))) {
      return '#333';
    }
    return Number(score) > 200 ? 'white' : 'black';
  }

  fmtScore(score: number | null | undefined): string {
    if (score == null || Number.isNaN(Number(score))) {
      return '—';
    }
    return String(score);
  }

  private normalize(s: string | null | undefined): string {
    if (!s) return '';
    try {
      return s
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
    } catch {
      return String(s || '').trim().toLowerCase();
    }
  }

  private computeNrForDistancia(name: string | null | undefined): number | null {
    const key = this.normalize(name);
    if (!key) return null;
    const item = this.distancias.find(d => this.normalize(d.name) === key);
    if (!item) return null;
    const ne = (item.neNivel as any)?.valor ?? null;
    const nd = (item.ndNivel as any)?.valor ?? null;
    const nc = (item.ncNivel as any)?.valor ?? null;
    if (ne == null || nd == null || nc == null) return null;
    const nr = Number(ne) * Number(nd) * Number(nc);
    return Math.round(nr);
  }

  private applyAutoScoresFromConfig(): void {
    if (!this.gerencia) return;
    if (this.companyDetails) {
      // Prioritario: usar configuración de empresa filtrada por metodología
      this.applyAutoScoresFromCompanyDetails();
      return;
    }
    // Fallback histórico: solo distancia desde catálogo público
    const nr = this.computeNrForDistancia(this.gerencia?.distancia);
    if (nr != null) {
      this.gerencia.scoreA = nr;
      this.recomputeTotalsAndRisk();
    }
  }

  private recomputeTotalsAndRisk(): void {
    let total = 0;
    let count = 0;
    const letters = ['A','B','C','D','E','F','G','H','I','J'];
    for (const L of letters) {
      const v = this.gerencia[`score${L}`];
      if (v != null && !Number.isNaN(Number(v))) {
        total += Number(v);
        count++;
      }
    }
    if (count > 0) {
      this.gerencia.scoreTotal = total;
      // Clasificación dinámica por metodología
      const key = (this.selectedMetodologiaKey || '').toLowerCase();
      if (key.includes('iper')) {
        // IPER (inclusive):
        // IV (Verde/Bajo): 1–20
        // III (Amarillo/Medio): 21–70
        // II (Naranja/Alto): 71–150
        // I (Rojo/Crítico): 151–250 o más
        if (total >= 151) {
          this.gerencia.nivelRiesgoRomano = 'I';
          this.gerencia.nivelRiesgo = 'I';
          this.gerencia.aceptacionGerencia = 'Crítico (Intolerable)';
        } else if (total >= 71) {
          this.gerencia.nivelRiesgoRomano = 'II';
          this.gerencia.nivelRiesgo = 'II';
          this.gerencia.aceptacionGerencia = 'Alto (Importante)';
        } else if (total >= 21) {
          this.gerencia.nivelRiesgoRomano = 'III';
          this.gerencia.nivelRiesgo = 'III';
          this.gerencia.aceptacionGerencia = 'Medio (Moderado)';
        } else {
          this.gerencia.nivelRiesgoRomano = 'IV';
          this.gerencia.nivelRiesgo = 'IV';
          this.gerencia.aceptacionGerencia = 'Bajo (Aceptable)';
        }
      } else {
        // GTC-45 (inclusive):
        // I: 600–6000
        // II: 150–500
        // III: 40–120
        // IV: <= 20
        if (total >= 600) {
          this.gerencia.nivelRiesgoRomano = 'I';
          this.gerencia.nivelRiesgo = 'I';
          this.gerencia.aceptacionGerencia = 'No Aceptable';
        } else if (total >= 150) {
          this.gerencia.nivelRiesgoRomano = 'II';
          this.gerencia.nivelRiesgo = 'II';
          this.gerencia.aceptacionGerencia = 'Aceptable con Controles';
        } else if (total >= 40) {
          this.gerencia.nivelRiesgoRomano = 'III';
          this.gerencia.nivelRiesgo = 'III';
          this.gerencia.aceptacionGerencia = 'Mejorable';
        } else {
          this.gerencia.nivelRiesgoRomano = 'IV';
          this.gerencia.nivelRiesgo = 'IV';
          this.gerencia.aceptacionGerencia = 'Aceptable';
        }
      }
    }
  }

  private loadBusinessDetailsByRuc(ruc: string): void {
    this.businessService.getByRuc(ruc).subscribe({
      next: (biz: any) => {
        const id = biz?.id;
        // Guardar nombre y logo para encabezado
        this.companyName = (biz?.tradeName || biz?.name || '').toString();
        const rawLogo: string | null = biz?.logo || null;
        this.companyLogoUrl = this.buildFileUrl(rawLogo);
        if (!id) return;
        this.businessService.getDetails(id).subscribe({
          next: (det: any) => {
            this.companyDetails = det || {};
            this.selectedMetodologiaId = this.pickMetodologiaId(det);
            // Guardar clave canónica de la metodología seleccionada para reglas de NR
            const mets = Array.isArray(det?.metodologiaRiesgos) ? det.metodologiaRiesgos : [];
            const chosen = mets.find((m: any) => (m?.id ?? null) === this.selectedMetodologiaId);
            this.selectedMetodologiaKey = this.normalizeMethodName(chosen?.name ?? chosen?.nombre);
            // Parsear contactos de emergencia
            this.emergencyContacts = this.parseEmergencyContacts(det?.emergencyContacts);
            // Reaplicar cálculo si ya tenemos la gerencia cargada
            this.applyAutoScoresFromConfig();
          },
          error: () => {}
        });
      },
      error: () => {}
    });
  }

  private buildFileUrl(p: string | null | undefined): string | null {
    if (!p) return null;
    const s = String(p);
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/api/')) return s;
    const rel = s.replace(/^\/+/, '');
    return `/api/files/${rel}`;
  }

  private resolveRucFromRouteSnapshot(): string {
    let p: ActivatedRoute | null = this.route;
    while (p) {
      const v = p.snapshot.paramMap.get('ruc');
      if (v) return v;
      p = p.parent as ActivatedRoute | null;
    }
    return '';
  }

  private parseEmergencyContacts(raw: any): Array<{ area: string; phone: string }> {
    try {
      const src = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const arr = Array.isArray(src) ? src : [];
      return arr
        .map((x: any) => ({ area: (x?.area || '').toString(), phone: (x?.phone || x?.numero || '').toString() }))
        .filter((x: any) => (x.area || x.phone))
        .slice(0, 4);
    } catch {
      return [];
    }
  }

  rowsEmergency(): Array<Array<{ area: string; phone: string }>> {
    const rows: Array<Array<{ area: string; phone: string }>> = [];
    const src = Array.isArray(this.emergencyContacts) ? this.emergencyContacts : [];
    for (let i = 0; i < src.length; i += 2) {
      rows.push(src.slice(i, i + 2));
    }
    return rows;
  }

  private normalizeMethodName(s: string | null | undefined): string {
    const base = this.normalize(s);
    return base.replace(/[^a-z0-9]/g, '');
  }

  private pickMetodologiaId(details: any): number | null {
    const mets = Array.isArray(details?.metodologiaRiesgos) ? details.metodologiaRiesgos : [];
    const canon = mets.map((m: any) => ({ id: m?.id ?? null, k: this.normalizeMethodName(m?.name ?? m?.nombre) }));
    // Preferir GTC-45
    const gtc = canon.find((m: any) => m.k === 'gtc45');
    if (gtc?.id != null) return gtc.id as number;
    if (canon.length === 1 && canon[0].id != null) return canon[0].id as number;
    return (canon.find((m: any) => m.id != null)?.id as number) ?? null;
  }

  private filterByMet(arr: any[], metId: number | null): any[] {
    const all = Array.isArray(arr) ? arr : [];
    if (metId == null) return all;
    const f = all.filter((x: any) => (x?.metodologiaRiesgo?.id ?? null) === metId);
    return f.length ? f : all;
  }

  private itemLabel(x: any): string {
    if (!x) return '';
    const n = (x.name ?? x.nombre ?? '').toString().trim();
    if (n) return n;
    return (x.description ?? x.descripcion ?? '').toString().trim();
  }

  private computeNrFromArr(arr: any[], value: string | null | undefined): number | null {
    const key = this.normalize(value);
    if (!key) return null;
    const item = (Array.isArray(arr) ? arr : []).find((e: any) => this.normalize(this.itemLabel(e)) === key);
    if (!item) return null;
    const ne = (item.neNivel as any)?.valor ?? null;
    const nd = (item.ndNivel as any)?.valor ?? null;
    const nc = (item.ncNivel as any)?.valor ?? null;
    if (ne == null || nd == null || nc == null) return null;
    const nr = Number(ne) * Number(nd) * Number(nc);
    return Math.round(nr);
  }

  private computeNrForMulti(arr: any[], values: string | null | undefined): number | null {
    if (!values) return null;
    const parts = String(values).split(',').map(v => this.normalize(v)).filter(v => !!v);
    if (!parts.length) return null;
    let max: number | null = null;
    for (const p of parts) {
      const item = (Array.isArray(arr) ? arr : []).find((e: any) => this.normalize(this.itemLabel(e)) === p);
      if (!item) continue;
      const ne = (item.neNivel as any)?.valor ?? null;
      const nd = (item.ndNivel as any)?.valor ?? null;
      const nc = (item.ncNivel as any)?.valor ?? null;
      if (ne == null || nd == null || nc == null) continue;
      const nr = Math.round(Number(ne) * Number(nd) * Number(nc));
      max = max == null ? nr : Math.max(max, nr);
    }
    return max;
  }

  private applyAutoScoresFromCompanyDetails(): void {
    if (!this.gerencia || !this.companyDetails) return;
    const d = this.companyDetails;
    const metId = this.selectedMetodologiaId;
    const f = (arr: any[]) => this.filterByMet(Array.isArray(arr) ? arr : [], metId);

    const setIfEmpty = (prop: string, value: number | null) => {
      const cur = this.gerencia[prop];
      const isEmpty = cur == null || Number.isNaN(Number(cur));
      if (isEmpty && value != null) this.gerencia[prop] = value;
    };

    setIfEmpty('scoreA', this.computeNrFromArr(f(d?.distanciaRecorrers || []), this.gerencia?.distancia));
    setIfEmpty('scoreB', this.computeNrFromArr(f(d?.tipoVias || []), this.gerencia?.tipoCarretera));
    setIfEmpty('scoreC', this.computeNrFromArr(f(d?.condicionClimaticas || []), this.gerencia?.clima));
    setIfEmpty('scoreD', this.computeNrFromArr(f(d?.horarioCirculaciones || []), this.gerencia?.horarioViaje));
    setIfEmpty('scoreE', this.computeNrFromArr(f(d?.estadoCarreteras || []), this.gerencia?.estadoVia));
    setIfEmpty('scoreF', this.computeNrFromArr(f(d?.tipoCargas || []), this.gerencia?.tipoCarga));
    setIfEmpty('scoreG', this.computeNrFromArr(f(d?.horaConducciones || []), this.gerencia?.horasConduccion));
    setIfEmpty('scoreH', this.computeNrFromArr(f(d?.horaDescansos || []), this.gerencia?.descansoConduc));
    setIfEmpty('scoreI', this.computeNrForMulti(f(d?.medioComunicaciones || []), this.gerencia?.mediosComunicacion));
    setIfEmpty('scoreJ', this.computeNrFromArr(f(d?.transportaPasajeros || []), this.gerencia?.llevaPasajeros));

    this.recomputeTotalsAndRisk();
  }
}
