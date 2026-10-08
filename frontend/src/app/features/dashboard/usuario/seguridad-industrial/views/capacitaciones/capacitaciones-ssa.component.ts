import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  SsaTrainingService,
  TrainingItem,
  TrainingMissing,
  TrainingPerson,
  TrainingSessionRow,
  TrainingReceived,
  TrainingWorker,
  TrainingYear
} from '../../services/ssa-training.service';

@Component({
  selector: 'app-capacitaciones-ssa',
  templateUrl: './capacitaciones-ssa.component.html',
  styleUrls: ['./capacitaciones-ssa.component.scss']
})
export class CapacitacionesSsaComponent implements OnInit {
  ruc = '';
  loading = false;
  error = '';
  ok = '';
  data: TrainingYear | null = null;
  sessions: TrainingSessionRow[] = [];
  selectedYear: number | null = null;
  tab: 'dashboard' | 'cronograma' | 'extras' | 'faltantes' | 'ingreso' | 'trabajador' = 'dashboard';
  months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  extraKinds: { id: string; label: string; icon: string }[] = [
    { id: 'ALERTA', label: 'Alerta operacional', icon: 'warning' },
    { id: 'LECCION', label: 'Lección aprendida', icon: 'menu_book' },
    { id: 'CLIENTE', label: 'Requerimiento de cliente', icon: 'apartment' },
    { id: 'URGENTE', label: 'Inducción urgente', icon: 'schedule' },
    { id: 'CLIMA', label: 'Emergencia / clima', icon: 'thunderstorm' }
  ];

  missing: TrainingMissing | null = null;
  loadingMissing = false;

  showActivity = false;
  savingActivity = false;
  editingId: number | null = null;
  form = this.emptyForm();
  deletingId: number | null = null;
  deleting = false;

  showSession = false;
  sessionItemId: number | null = null;
  sessionDate = '';
  sessionPlace = '';
  sessionHours: number | null = 1;
  sessionFacilitator = '';
  sessionNotes = '';
  sessionPeople: TrainingPerson[] = [];
  present = new Set<number>();
  printPick = new Set<number>();
  saving = false;
  peopleFilter = '';
  sessionFile: File | null = null;
  sessionPhotos: { file: File; url: string }[] = [];

  workers: TrainingWorker[] = [];
  workerFilter = '';
  selectedWorker: TrainingWorker | null = null;
  loadingWorkers = false;
  loadingWorker = false;
  workerPhotoBroken = false;

  showDoc = false;
  showMissingDoc = false;
  showWorkerDoc = false;
  pendingMissingDoc = false;
  registerKind: 'missing' | 'convocados' = 'missing';
  registerFill: {
    topic: string;
    place: string;
    facilitator: string;
    duration: string;
    date: string;
    subtema: string;
    tipo: 'IND' | 'CAP' | 'ENT' | 'PRE' | null;
  } | null = null;
  uploadingDoc = false;
  paperSize: 'A4' | 'A3' = 'A3';

  selectedSiteId: number | 'all' = 'all';
  selectedRole: string | null = null;
  filterStatus: 'todos' | 'pendientes' | 'completos' = 'todos';
  drawerItem: TrainingItem | null = null;
  extraMode = false;
  extraPdf: File | null = null;
  extraPhotos: { file: File; url: string }[] = [];
  existingEvidencePdf = '';
  existingEvidencePhotos: string[] = [];
  scheduleQuery = '';
  scheduleAudience = 'all';
  schedulePage = 1;
  schedulePageSize = 12;
  extraQuery = '';
  extraKindFilter = 'all';
  extraOpenId: number | null = null;
  extraExpandAll = false;
  ingresoQuery = '';
  ingresoOrigin: 'all' | 'PLAN' | 'REINDUCCION' | 'EXTRA' = 'all';
  ingresoOpenId: number | null = null;
  ingresoExpandAll = false;
  previewUrl: string | null = null;
  previewKind: 'image' | 'pdf' | 'other' = 'other';
  previewSafe: SafeResourceUrl | null = null;

  constructor(private route: ActivatedRoute, private api: SsaTrainingService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) {
        this.ruc = found;
        break;
      }
      parent = parent.parent;
    }
    this.sessionDate = new Date().toISOString().slice(0, 10);
    if (this.ruc) this.load();
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.previewUrl) this.closePreview();
    else if (this.showWorkerDoc) this.closeWorkerDoc();
    else if (this.showMissingDoc) this.closeMissingDoc();
    else if (this.showSession) this.closeSession();
    else if (this.deletingId) this.deletingId = null;
    else if (this.showActivity) this.closeActivity();
    else if (this.drawerItem) this.drawerItem = null;
    else if (this.showDoc) this.closeDoc();
  }

  get canWrite(): boolean {
    return !!this.data?.canWrite;
  }

  get isApproved(): boolean {
    return this.data?.approvalStatus === 'APPROVED';
  }

  get companyLabel(): string {
    return (this.data?.companyName || this.data?.companyShort || '').trim();
  }

  get companyShortLabel(): string {
    return (this.data?.companyShort || this.data?.companyName || '').trim();
  }

  get planYear(): number {
    return this.selectedYear || this.data?.year || new Date().getFullYear();
  }

  get scheduleItems(): TrainingItem[] {
    return (this.data?.items || []).filter(i => this.isScheduled(i) && this.isEnteredTopic(i));
  }

  get extraItems(): TrainingItem[] {
    return (this.data?.items || []).filter(i => i.origin === 'EVENTUAL');
  }

  get missingTopicOptions(): TrainingItem[] {
    return (this.data?.items || []).filter(i => this.isScheduled(i));
  }

  get ingresoItems(): TrainingItem[] {
    const ids = new Set((this.sessions || []).map(s => s.itemId));
    const rows = (this.data?.items || []).filter(i => ids.has(i.id));
    return rows.sort((a, b) => {
      const da = this.latestSession(a)?.sessionDate || '';
      const db = this.latestSession(b)?.sessionDate || '';
      return db.localeCompare(da);
    });
  }

  get filteredIngreso(): TrainingItem[] {
    let rows = this.ingresoItems;
    if (this.ingresoOrigin === 'PLAN') rows = rows.filter(i => i.origin !== 'EVENTUAL');
    if (this.ingresoOrigin === 'EXTRA') rows = rows.filter(i => i.origin === 'EVENTUAL');
    if (this.ingresoOrigin === 'REINDUCCION') rows = rows.filter(i => this.itemHasReinduction(i));
    const q = (this.ingresoQuery || '').trim().toLowerCase();
    if (q) {
      rows = rows.filter(i =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.audienceLabel || '').toLowerCase().includes(q) ||
        this.facilitatorLabel(i).toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        this.ingresoPeople(i).some(p => (p.fullName || '').toLowerCase().includes(q) || (p.cedula || '').includes(q))
      );
    }
    return rows;
  }

  ingresoCount(kind: 'all' | 'PLAN' | 'REINDUCCION' | 'EXTRA'): number {
    if (kind === 'all') return this.ingresoItems.length;
    if (kind === 'PLAN') return this.ingresoItems.filter(i => i.origin !== 'EVENTUAL').length;
    if (kind === 'EXTRA') return this.ingresoItems.filter(i => i.origin === 'EVENTUAL').length;
    return this.ingresoItems.filter(i => this.itemHasReinduction(i)).length;
  }

  itemHasReinduction(it: TrainingItem): boolean {
    return this.itemSessions(it.id).some(s => !!s.reinduction || s.origin === 'REINDUCCION');
  }

  ingresoPeople(it: TrainingItem): TrainingPerson[] {
    const map = new Map<number, TrainingPerson>();
    for (const s of this.itemSessions(it.id)) {
      for (const p of s.attendees || []) {
        if (p.id != null) map.set(p.id, p);
      }
    }
    return [...map.values()].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'es'));
  }

  ingresoOpen(it: TrainingItem): boolean {
    return this.ingresoExpandAll || this.ingresoOpenId === it.id;
  }

  toggleIngreso(it: TrainingItem): void {
    this.ingresoOpenId = this.ingresoOpenId === it.id ? null : it.id;
  }

  toggleAllIngreso(): void {
    this.ingresoExpandAll = !this.ingresoExpandAll;
    if (this.ingresoExpandAll) this.ingresoOpenId = null;
  }

  sessionKindLabel(s: TrainingSessionRow): string {
    if (s.reinduction || s.origin === 'REINDUCCION') return 'Reinducción';
    if (s.origin === 'EVENTUAL') return 'Fuera de cronograma';
    return 'Plan anual';
  }

  get filteredSchedule(): TrainingItem[] {
    let rows = this.scheduleItems;
    const q = (this.scheduleQuery || '').trim().toLowerCase();
    if (q) rows = rows.filter(i => (i.name || '').toLowerCase().includes(q) || (i.audienceLabel || '').toLowerCase().includes(q));
    if (this.scheduleAudience !== 'all') {
      rows = rows.filter(i => (i.audienceCode || 'ALL') === this.scheduleAudience);
    }
    return rows;
  }

  get schedulePages(): number {
    return Math.max(1, Math.ceil(this.filteredSchedule.length / this.schedulePageSize));
  }

  get pagedSchedule(): TrainingItem[] {
    const start = (this.schedulePage - 1) * this.schedulePageSize;
    return this.filteredSchedule.slice(start, start + this.schedulePageSize);
  }

  get scheduleStats() {
    const rows = this.scheduleItems;
    const obl = rows.reduce((s, i) => s + (i.obligated || 0), 0);
    const tr = rows.reduce((s, i) => s + (i.trained || 0), 0);
    return {
      count: rows.length,
      percent: obl === 0 ? 0 : Math.round(100 * tr / obl),
      trained: tr,
      obligated: obl
    };
  }

  get extraStats() {
    const rows = this.extraItems;
    const ids = new Set(rows.map(i => i.id));
    const attended = rows.reduce((s, i) => s + (i.trained || 0), 0);
    const sessions = this.sessions.filter(s => ids.has(s.itemId)).length;
    const pending = rows.filter(i => (i.missing || 0) > 0).length;
    return { count: rows.length, attended, sessions, pending };
  }

  get filteredExtras(): TrainingItem[] {
    let rows = this.extraItems;
    const q = (this.extraQuery || '').trim().toLowerCase();
    if (q) {
      rows = rows.filter(i =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.place || '').toLowerCase().includes(q)
      );
    }
    if (this.extraKindFilter !== 'all') {
      rows = rows.filter(i => this.extraKindOf(i) === this.extraKindFilter);
    }
    return rows;
  }

  extraKindCount(kind: string): number {
    if (kind === 'all') return this.extraItems.length;
    return this.extraItems.filter(i => this.extraKindOf(i) === kind).length;
  }

  extraKindOf(it: TrainingItem): string {
    const m = (it.description || '').match(/^\[(ALERTA|LECCION|CLIENTE|URGENTE|CLIMA)\]\s*/);
    return m ? m[1] : 'ALERTA';
  }

  extraKindMeta(it: TrainingItem) {
    const id = this.extraKindOf(it);
    return this.extraKinds.find(k => k.id === id) || this.extraKinds[0];
  }

  extraText(it: TrainingItem): string {
    return (it.description || '').replace(/^\[(ALERTA|LECCION|CLIENTE|URGENTE|CLIMA)\]\s*/, '').trim();
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  extraCode(it: TrainingItem): string {
    return `EXT-${this.data?.year || ''}-${String(it.id).padStart(3, '0')}`;
  }

  extraDate(it: TrainingItem): string {
    return this.formatSessionDate(this.latestSession(it)?.sessionDate);
  }

  formatSessionDate(raw?: string | null): string {
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  schedulePageList(): number[] {
    return Array.from({ length: this.schedulePages }, (_, i) => i + 1);
  }

  itemEvidenceUrl(it: TrainingItem): string | undefined {
    return this.latestSession(it)?.evidenceUrl || it.evidencePdfUrl;
  }

  openItemEvidence(it: TrainingItem): void {
    const url = this.itemEvidenceUrl(it);
    if (url) this.openEvidence(url);
  }

  itemSessions(itemId: number): TrainingSessionRow[] {
    return this.sessions.filter(s => s.itemId === itemId);
  }

  latestSession(it: TrainingItem): TrainingSessionRow | null {
    return this.itemSessions(it.id)[0] || null;
  }

  facilitatorLabel(it: TrainingItem): string {
    if (it.facilitator) return it.facilitator;
    const last = this.latestSession(it);
    if (last?.facilitator) return last.facilitator;
    return it.facilitatorType === 'EXTERNO' ? 'Facilitador externo' : 'Seguridad Industrial';
  }

  extraOpen(it: TrainingItem): boolean {
    return this.extraExpandAll || this.extraOpenId === it.id;
  }

  toggleExtra(it: TrainingItem): void {
    this.extraOpenId = this.extraOpenId === it.id ? null : it.id;
  }

  toggleAllExtras(): void {
    this.extraExpandAll = !this.extraExpandAll;
    if (this.extraExpandAll) this.extraOpenId = null;
  }

  resetSchedulePage(): void {
    this.schedulePage = 1;
  }

  setSchedulePage(page: number): void {
    this.schedulePage = Math.min(this.schedulePages, Math.max(1, page));
  }

  get plannedItems(): TrainingItem[] {
    return this.scheduleItems.filter(i => !this.isDrill(i));
  }

  get drillItems(): TrainingItem[] {
    return this.scheduleItems.filter(i => this.isDrill(i));
  }

  isScheduled(it: TrainingItem): boolean {
    return (it.origin || 'PLANIFICADA') !== 'EVENTUAL';
  }

  /** Solo temas que la empresa ingresó al cronograma (no catálogo vacío ni extras). */
  isEnteredTopic(it: TrainingItem): boolean {
    if (!it) return false;
    if ((it.sessions || 0) > 0) return true;
    if ((it.facilitator || '').trim()) return true;
    if ((it.place || '').trim()) return true;
    const desc = (it.description || '').trim();
    return !!desc && !desc.startsWith('[');
  }

  get lastItems(): TrainingItem[] {
    return this.scheduleItems.slice(-3).reverse();
  }

  get companyInitials(): string {
    const s = this.companyShortLabel || this.companyLabel || 'SST';
    const parts = s.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return s.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'SST';
  }

  get census() {
    return this.data?.census;
  }

  get sites() {
    return this.census?.sites || [];
  }

  get roles() {
    return this.census?.roles || [];
  }

  get operators() {
    return this.census?.operators || [];
  }

  get filteredModules(): TrainingItem[] {
    let rows = this.scheduleItems;
    if (this.selectedRole) {
      const role = this.selectedRole.toLowerCase();
      rows = rows.filter(it => {
        const aud = (it.audienceCode || 'ALL').toUpperCase();
        if (aud === 'ALL') return true;
        if (role.includes('supervisor') || role.includes('jefe')) return aud === 'SUPERVISORS';
        if (role.includes('conductor') || role.includes('chofer')) return aud === 'DRIVERS';
        return true;
      });
    }
    if (this.filterStatus === 'pendientes') rows = rows.filter(i => (i.missing || 0) > 0);
    if (this.filterStatus === 'completos') rows = rows.filter(i => (i.percent || 0) >= 100);
    return rows;
  }

  pct(part?: number, total?: number): number {
    if (!total) return 0;
    return Math.round(100 * (part || 0) / total);
  }

  arcOffset(percent?: number): number {
    const p = Math.min(100, Math.max(0, percent || 0));
    return Math.round(267 * (1 - p / 100));
  }

  needleDeg(percent?: number): number {
    const p = Math.min(100, Math.max(0, percent || 0));
    return -180 + (p / 100) * 180;
  }

  donutOffset(percent?: number): number {
    const circ = 2 * Math.PI * 34;
    const p = Math.min(100, Math.max(0, percent || 0));
    return circ - (p / 100) * circ;
  }

  selectSite(id: number | 'all'): void {
    this.selectedSiteId = id;
  }

  selectRole(name: string): void {
    this.selectedRole = this.selectedRole === name ? null : name;
  }

  clearRole(): void {
    this.selectedRole = null;
  }

  resetHubFilters(): void {
    this.selectedSiteId = 'all';
    this.selectedRole = null;
    this.filterStatus = 'todos';
  }

  openModule(it: TrainingItem): void {
    this.drawerItem = it;
    if (it?.id) this.refreshMissing(it.id);
  }

  closeDrawer(): void {
    this.drawerItem = null;
  }

  get selectedMonthCount(): number {
    return this.form.months.length;
  }

  quarterPct(q: 1 | 2 | 3 | 4): number {
    const ranges: Record<number, number[]> = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] };
    const n = this.form.months.filter(m => ranges[q].includes(m)).length;
    const total = this.form.months.length;
    return total === 0 ? 0 : Math.round(100 * n / total);
  }

  load(year?: number): void {
    if (!this.ruc) return;
    this.loading = true;
    this.error = '';
    this.api.year(this.ruc, year).subscribe({
      next: (res) => {
        this.data = res;
        this.selectedYear = res.year;
        this.loading = false;
        this.api.sessions(this.ruc, res.year).subscribe({
          next: (s) => (this.sessions = s || []),
          error: () => (this.sessions = [])
        });
        if (this.tab === 'trabajador') this.loadWorkers();
        if (this.tab === 'faltantes' && this.missing?.itemId) this.refreshMissing(this.missing.itemId);
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar el plan de capacitación SSA.';
      }
    });
  }

  onYearChange(): void {
    this.missing = null;
    this.selectedWorker = null;
    this.load(this.selectedYear ?? undefined);
  }

  hasMonth(item: TrainingItem, month: number): boolean {
    return (item.months || []).includes(month);
  }

  monthLabel(n: number): string {
    return this.months[n - 1] || String(n);
  }

  openMissing(item: { id: number }): void {
    if (!item?.id) return;
    this.tab = 'faltantes';
    this.showDoc = false;
    this.registerKind = 'missing';
    this.pendingMissingDoc = true;
    this.refreshMissing(item.id);
  }

  private refreshMissing(itemId: number): void {
    this.loadingMissing = true;
    this.api.missing(this.ruc, itemId).subscribe({
      next: (res) => {
        this.missing = res;
        this.loadingMissing = false;
        if (this.pendingMissingDoc) {
          this.pendingMissingDoc = false;
          this.showMissingDoc = true;
        }
      },
      error: () => {
        this.loadingMissing = false;
        this.pendingMissingDoc = false;
        this.error = 'No se pudo cargar el personal faltante.';
      }
    });
  }

  get missingItem(): TrainingItem | null {
    const id = this.missing?.itemId;
    if (!id) return null;
    return (this.data?.items || []).find(i => i.id === id) || null;
  }

  get missingDocDate(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  get registerTitle(): string {
    return (this.data?.registerName || 'REGISTRO DE CAPACITACIÓN Y ENTRENAMIENTO').trim().toUpperCase();
  }

  get registerCode(): string {
    return (this.data?.registerCode || this.data?.docCode || '').trim();
  }

  get registerProcess(): string {
    return (this.data?.registerProcess || 'Gestión de Talento Humano').trim();
  }

  get registerApprovedBy(): string {
    return 'Gerente General';
  }

  get registerDate(): string {
    return (this.data?.registerDate || '').trim() || this.missingDocDate;
  }

  get missingPrintRows(): { n: number; person: TrainingPerson | null }[] {
    const people = this.registerPeople;
    const rows: { n: number; person: TrainingPerson | null }[] = [];
    const total = Math.max(people.length, 1);
    for (let i = 0; i < total; i++) {
      rows.push({ n: i + 1, person: people[i] || null });
    }
    return rows;
  }

  get registerPages(): number {
    return Math.max(1, Math.ceil(this.missingPrintRows.length / 20));
  }

  get registerPeople(): TrainingPerson[] {
    if (this.registerKind === 'convocados') {
      const all = this.sessionPeople || [];
      if (this.printPick.size > 0) return all.filter(p => this.printPick.has(p.id));
      return all;
    }
    return this.missing?.people || [];
  }

  get registerTopicName(): string {
    if (this.registerFill) return this.registerFill.topic;
    if (this.registerKind === 'convocados') {
      if (this.extraMode) return (this.form.name || '').trim();
      return this.topicName(this.sessionItemId);
    }
    return this.missing?.topicName || '';
  }

  get registerPlace(): string {
    if (this.registerFill) return this.registerFill.place;
    if (this.registerKind === 'convocados') {
      return ((this.extraMode ? this.form.place : this.sessionPlace) || '').trim();
    }
    return (this.missingItem?.place || '').trim();
  }

  get registerFacilitator(): string {
    if (this.registerFill) return this.registerFill.facilitator;
    if (this.registerKind === 'convocados') {
      const raw = this.extraMode ? this.form.facilitator : this.sessionFacilitator;
      if ((raw || '').trim()) return raw.trim();
      const it = this.sessionItemId ? this.data?.items?.find(i => i.id === this.sessionItemId) : null;
      return it ? this.facilitatorLabel(it) : '';
    }
    return this.missingItem ? this.facilitatorLabel(this.missingItem) : '';
  }

  get registerDuration(): string {
    if (this.registerFill) return this.registerFill.duration;
    if (this.registerKind === 'convocados' && this.extraMode) {
      const n = this.form.durationValue;
      const u = this.form.durationUnit;
      return n ? `${n} ${u}` : '';
    }
    if (this.registerKind === 'convocados') {
      if (this.sessionHours) return `${this.sessionHours} horas`;
      return this.missingItem?.duration || this.data?.items?.find(i => i.id === this.sessionItemId)?.duration || '';
    }
    return this.missingItem?.duration || '';
  }

  get registerSessionDate(): string {
    if (this.registerFill?.date) return this.registerFill.date;
    const raw = this.registerKind === 'convocados'
      ? ((this.extraMode ? this.form.extraDate : this.sessionDate) || '')
      : '';
    return this.formatDmy(raw) || this.missingDocDate;
  }

  get missingSubtema(): string {
    if (this.registerFill) return this.registerFill.subtema;
    if (this.registerKind === 'convocados' && this.extraMode) {
      return (this.form.description || '').replace(/\s+/g, ' ').trim();
    }
    const it = this.registerKind === 'convocados'
      ? (this.data?.items?.find(i => i.id === this.sessionItemId) || null)
      : this.missingItem;
    const raw = it ? this.itemObjective(it) : '';
    return (raw || '').replace(/[\n;•]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  get registerTipo(): 'IND' | 'CAP' | 'ENT' | 'PRE' | null {
    if (this.registerFill) return this.registerFill.tipo;
    return this.tipoFromNameAndType(this.registerTopicName, this.registerActivityType, this.registerKind === 'convocados' && !this.extraMode
      ? (this.data?.items?.find(i => i.id === this.sessionItemId) || null)
      : this.missingItem);
  }

  private get registerActivityType(): string {
    if (this.registerKind === 'convocados' && this.extraMode) return this.form.activityType || '';
    const it = this.registerKind === 'convocados'
      ? this.data?.items?.find(i => i.id === this.sessionItemId)
      : this.missingItem;
    return it?.activityType || '';
  }

  private formatDmy(raw: string): string {
    if (/^\d{4}-\d{2}-\d{2}/.test(raw || '')) {
      const [y, m, d] = raw.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    return (raw || '').trim();
  }

  private tipoFromNameAndType(topic: string, activityType: string, it: TrainingItem | null): 'IND' | 'CAP' | 'ENT' | 'PRE' | null {
    const name = (topic || '').toUpperCase();
    const type = (activityType || '').toUpperCase();
    if (name.includes('PRE-OPER') || name.includes('PREOPER') || type === 'PREOPERACIONAL' || type === 'PRE-OPERACIONAL') return 'PRE';
    if (name.includes('INDUCCI') || type === 'INDUCCION') return 'IND';
    if (type === 'ENTRENAMIENTO' || (it != null && this.isEntre(it))) return 'ENT';
    if (type === 'CAPACITACION' || type === 'SIMULACRO' || (it != null && this.isCapac(it))) return 'CAP';
    if ((topic || '').trim()) return 'CAP';
    return null;
  }

  private captureRegisterFill(): void {
    if (this.extraMode && this.showActivity) {
      const n = this.form.durationValue;
      const u = this.form.durationUnit;
      this.registerFill = {
        topic: (this.form.name || '').trim(),
        place: (this.form.place || '').trim(),
        facilitator: (this.form.facilitator || '').trim(),
        duration: n ? `${n} ${u}` : '',
        date: this.formatDmy(this.form.extraDate || '') || this.missingDocDate,
        subtema: (this.form.description || '').replace(/\s+/g, ' ').trim(),
        tipo: this.tipoFromNameAndType(this.form.name, this.form.activityType, null)
      };
      return;
    }
    const it = this.sessionItemId ? (this.data?.items?.find(i => i.id === this.sessionItemId) || null) : null;
    this.registerFill = {
      topic: this.topicName(this.sessionItemId),
      place: (this.sessionPlace || it?.place || '').trim(),
      facilitator: (this.sessionFacilitator || (it ? this.facilitatorLabel(it) : '')).trim(),
      duration: this.sessionHours ? `${this.sessionHours} horas` : (it?.duration || ''),
      date: this.formatDmy(this.sessionDate || '') || this.missingDocDate,
      subtema: it ? this.itemObjective(it) : '',
      tipo: this.tipoFromNameAndType(this.topicName(this.sessionItemId), it?.activityType || '', it)
    };
  }

  missingTypeMark(kind: 'IND' | 'CAP' | 'ENT' | 'PRE'): boolean {
    return this.registerTipo === kind;
  }

  openMissingDoc(): void {
    if (!this.missing) return;
    this.registerKind = 'missing';
    this.showDoc = false;
    this.showWorkerDoc = false;
    this.showMissingDoc = true;
  }

  openConvocadosDoc(): void {
    if (this.extraMode && this.showActivity && !(this.form.name || '').trim()) {
      this.error = 'Escriba el tema de la capacitación para llenar el registro PDF.';
      return;
    }
    this.error = '';
    this.captureRegisterFill();
    this.registerKind = 'convocados';
    this.showDoc = false;
    this.showWorkerDoc = false;
    const open = () => { this.showMissingDoc = true; };
    if (this.extraMode && this.showActivity) {
      this.api.peopleByAudience(this.ruc, this.form.audienceCode || 'ALL').subscribe({
        next: (rows) => {
          this.sessionPeople = rows || [];
          open();
        },
        error: () => open()
      });
      return;
    }
    if (this.sessionPeople?.length) {
      open();
      return;
    }
    if (this.sessionItemId) {
      this.api.people(this.ruc, this.sessionItemId).subscribe({
        next: (rows) => {
          this.sessionPeople = rows || [];
          open();
        },
        error: () => open()
      });
      return;
    }
    open();
  }

  closeMissingDoc(): void {
    this.showMissingDoc = false;
    this.registerKind = 'missing';
    this.registerFill = null;
  }

  printMissingDoc(): void {
    this.showDoc = false;
    if (this.registerKind === 'convocados') this.captureRegisterFill();
    this.showMissingDoc = true;
    this.printSheet('.miss-sheet', ['ssa-print-miss']);
  }

  openActivity(): void {
    if (!this.canWrite) return;
    this.extraMode = false;
    this.editingId = null;
    this.form = this.emptyForm();
    this.clearExtraFiles();
    this.form.plannedCount = this.audienceHeadcount(this.form.audienceCode);
    this.showActivity = true;
  }

  openExtra(): void {
    if (!this.canWrite) return;
    this.extraMode = true;
    this.editingId = null;
    this.form = this.emptyForm();
    this.clearExtraFiles();
    this.form.extraKind = 'ALERTA';
    this.form.months = [];
    this.form.plannedCount = this.audienceHeadcount(this.form.audienceCode);
    this.showActivity = true;
    this.resetAttendancePicker();
    if (this.extraMode) this.loadAudiencePeople();
  }

  openEdit(item: TrainingItem): void {
    if (!this.canWrite || !item?.id) return;
    this.extraMode = item.origin === 'EVENTUAL';
    this.editingId = item.id;
    this.form = this.formFromItem(item);
    this.clearExtraFiles();
    this.existingEvidencePdf = item.evidencePdfUrl || '';
    this.existingEvidencePhotos = [...(item.evidencePhotoUrls || [])];
    this.showActivity = true;
  }

  closeActivity(): void {
    this.showActivity = false;
    this.editingId = null;
    this.extraMode = false;
    this.clearExtraFiles();
    this.resetAttendancePicker();
  }

  clearExtraFiles(): void {
    this.extraPhotos.forEach(p => URL.revokeObjectURL(p.url));
    this.extraPdf = null;
    this.extraPhotos = [];
    this.existingEvidencePdf = '';
    this.existingEvidencePhotos = [];
  }

  onExtraPdf(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    input.value = '';
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      this.error = 'El acta debe ser un PDF.';
      return;
    }
    this.extraPdf = file;
  }

  onExtraPhotos(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    for (const file of files) {
      if (this.extraPhotos.length >= 4) break;
      const ok = /^image\/(jpeg|jpg|png|webp)$/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!ok) {
        this.error = 'Las evidencias deben ser JPG, PNG o WEBP.';
        continue;
      }
      this.extraPhotos = [...this.extraPhotos, { file, url: URL.createObjectURL(file) }];
    }
  }

  removeExtraPhoto(index: number): void {
    const row = this.extraPhotos[index];
    if (row) URL.revokeObjectURL(row.url);
    this.extraPhotos = this.extraPhotos.filter((_, i) => i !== index);
  }

  toggleMonth(m: number): void {
    if (this.form.months.includes(m)) {
      this.form.months = this.form.months.filter(x => x !== m);
    } else {
      this.form.months = [...this.form.months, m].sort((a, b) => a - b);
    }
  }

  setAudience(code: string): void {
    this.form.audienceCode = code;
    this.form.plannedCount = this.audienceHeadcount(code);
    if (this.extraMode && this.showActivity && !this.editingId) this.loadAudiencePeople();
  }

  audienceHeadcount(code?: string): number {
    const aud = (code || 'ALL').toUpperCase();
    const same = (this.data?.items || []).find(i => (i.audienceCode || 'ALL').toUpperCase() === aud && (i.obligated || 0) > 0);
    if (same?.obligated) return same.obligated;
    if (aud === 'ALL') return this.census?.headcount || 0;
    return 0;
  }

  topicPeople(it: TrainingItem): number {
    return it?.obligated || 0;
  }

  get extraAbsentCount(): number {
    return Math.max(0, this.sessionPeople.length - this.present.size);
  }

  audienceLabel(code: string): string {
    if (code === 'SUPERVISORS') return 'Supervisores y jefaturas';
    if (code === 'DRIVERS') return 'Conductores';
    if (code === 'BRIGADE') return 'Personal de proyectos y brigadistas';
    return 'Todas las áreas';
  }

  saveActivity(): void {
    if (!this.canWrite) return;
    const name = (this.form.name || '').trim();
    if (!name) {
      this.error = 'Indique el tema / título de la capacitación.';
      return;
    }
    const facilitator = (this.form.facilitator || '').trim();
    if (!facilitator) {
      this.error = 'Indique el nombre del facilitador / instructor.';
      return;
    }
    if (this.extraMode && !this.editingId) {
      if (!this.extraPdf) {
        this.error = 'Adjunte el PDF del acta o registro.';
        return;
      }
    }
    this.savingActivity = true;
    this.error = '';
    this.ok = '';
    const materials = [
      this.form.matVideos ? 'Videos instructivos' : '',
      this.form.matPpt ? 'Presentación PPT' : '',
      this.form.matKit ? 'Material práctico' : '',
      this.form.matExam ? 'Evaluación escrita' : ''
    ].filter(Boolean).join(', ');
    const n = Number(this.form.durationValue) || (this.form.durationUnit === 'Minutos' ? 30 : 1);
    const duration = this.form.durationUnit === 'Minutos'
      ? `${n} min`
      : this.form.durationUnit === 'Jornada'
        ? (n <= 1 ? 'Jornada completa' : `${n} jornadas`)
        : `${n} ${n === 1 ? 'hora' : 'horas'}`;
    const rawDesc = (this.form.description || '').trim();
    const desc = this.extraMode && this.form.extraKind
      ? `[${this.form.extraKind}] ${rawDesc}`
      : rawDesc;
    const payload = {
      name,
      description: desc,
      activityType: this.form.activityType,
      facilitatorType: this.form.facilitatorType,
      place: this.form.place.trim(),
      materials,
      audienceCode: this.form.audienceCode,
      audienceLabel: this.audienceLabel(this.form.audienceCode),
      months: this.extraMode ? [] : this.form.months,
      duration,
      methodology: this.form.methodology,
      plannedCount: this.audienceHeadcount(this.form.audienceCode) || undefined,
      facilitator
    };
    const editing = this.editingId;
    const photos = this.extraPhotos.map(p => p.file);
    const req = this.extraMode
      ? this.api.saveItem(this.ruc, payload, editing, this.extraPdf, photos)
      : (editing
        ? this.api.updateItem(this.ruc, editing, payload)
        : this.api.addEventual(this.ruc, payload));
    req.subscribe({
      next: (item) => {
        if (this.extraMode && !editing && item?.id) {
          this.saveExtraAttendance(item.id);
          return;
        }
        this.finishActivitySave(!!editing);
      },
      error: (err) => {
        this.savingActivity = false;
        this.error = err?.error?.message || 'No se pudo guardar la capacitación.';
      }
    });
  }

  private resetAttendancePicker(): void {
    this.sessionPeople = [];
    this.present = new Set();
    this.printPick = new Set();
    this.peopleFilter = '';
  }

  loadAudiencePeople(): void {
    this.api.peopleByAudience(this.ruc, this.form.audienceCode || 'ALL').subscribe({
      next: (rows) => {
        this.sessionPeople = rows || [];
        this.present = new Set();
        this.printPick = new Set();
      },
      error: () => {
        this.sessionPeople = [];
        this.present = new Set();
        this.printPick = new Set();
      }
    });
  }

  private extraHours(): number {
    const n = Number(this.form.durationValue) || 1;
    if (this.form.durationUnit === 'Minutos') return Math.max(0.5, n / 60);
    if (this.form.durationUnit === 'Jornada') return n <= 1 ? 8 : n * 8;
    return n;
  }

  private saveExtraAttendance(itemId: number): void {
    const attendees = this.sessionPeople.map(p => ({
      employeeId: p.id,
      present: this.present.has(p.id)
    }));
    const photos = this.extraPhotos.map(p => p.file);
    this.api.createSession(this.ruc, {
      itemId,
      sessionDate: this.form.extraDate || new Date().toISOString().slice(0, 10),
      place: (this.form.place || '').trim(),
      hours: Math.max(1, Math.round(this.extraHours())),
      facilitator: (this.form.facilitator || '').trim(),
      notes: (this.form.description || '').trim(),
      attendees
    }, this.extraPdf, photos).subscribe({
      next: () => this.finishActivitySave(false),
      error: (err) => {
        this.savingActivity = false;
        this.showActivity = false;
        this.editingId = null;
        this.extraMode = false;
        this.clearExtraFiles();
        this.resetAttendancePicker();
        this.tab = 'extras';
        this.error = err?.error?.message
          || 'El evento se guardó, pero no se pudo registrar la asistencia. Use el botón Asistencia.';
        this.load(this.selectedYear ?? undefined);
      }
    });
  }

  private finishActivitySave(editing: boolean): void {
    const extra = this.extraMode;
    this.savingActivity = false;
    this.showActivity = false;
    this.editingId = null;
    this.extraMode = false;
    this.clearExtraFiles();
    this.resetAttendancePicker();
    this.ok = editing
      ? 'Tema actualizado.'
      : (extra
        ? 'Evento registrado. Quedó marcado quién asistió y quién falta.'
        : 'La capacitación se cargó en el cronograma y queda lista para registrar asistencia.');
    if (extra) this.tab = 'extras';
    this.load(this.selectedYear ?? undefined);
  }

  startSession(item: { id: number }): void {
    if (!item?.id) return;
    this.sessionItemId = item.id;
    const full = this.data?.items?.find(i => i.id === item.id);
    this.sessionPlace = full?.place || '';
    this.sessionHours = 1;
    this.sessionFacilitator = full ? this.facilitatorLabel(full) : '';
    this.sessionNotes = '';
    this.sessionDate = new Date().toISOString().slice(0, 10);
    this.peopleFilter = '';
    this.sessionFile = null;
    this.clearSessionPhotos();
    this.showSession = true;
    this.loadPeople();
  }

  closeSession(): void {
    this.showSession = false;
    this.sessionFile = null;
    this.clearSessionPhotos();
  }

  onSessionFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.sessionFile = input.files && input.files[0] ? input.files[0] : null;
  }

  clearSessionPhotos(): void {
    this.sessionPhotos.forEach(p => URL.revokeObjectURL(p.url));
    this.sessionPhotos = [];
  }

  onSessionPhotos(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    for (const file of files) {
      if (this.sessionPhotos.length >= 4) break;
      const ok = /^image\/(jpeg|jpg|png|webp)$/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
      if (!ok) {
        this.error = 'Las evidencias deben ser JPG, PNG o WEBP.';
        continue;
      }
      this.sessionPhotos = [...this.sessionPhotos, { file, url: URL.createObjectURL(file) }];
    }
  }

  removeSessionPhoto(index: number): void {
    const row = this.sessionPhotos[index];
    if (row) URL.revokeObjectURL(row.url);
    this.sessionPhotos = this.sessionPhotos.filter((_, i) => i !== index);
  }

  loadPeople(): void {
    if (!this.sessionItemId) {
      this.sessionPeople = [];
      return;
    }
    this.api.people(this.ruc, this.sessionItemId).subscribe({
      next: (rows) => {
        this.sessionPeople = rows || [];
        this.present = new Set();
        this.printPick = new Set();
      },
      error: (err) => {
        this.sessionPeople = [];
        this.present = new Set();
        this.printPick = new Set();
        this.error = err?.error?.message || 'No se pudo cargar el personal de Talento Humano.';
      }
    });
  }

  filteredPeople(): TrainingPerson[] {
    const q = (this.peopleFilter || '').trim().toLowerCase();
    if (!q) return this.sessionPeople;
    return this.sessionPeople.filter(p =>
      (p.fullName || '').toLowerCase().includes(q) ||
      (p.cedula || '').includes(q) ||
      (p.position || '').toLowerCase().includes(q)
    );
  }

  togglePresent(id: number): void {
    const next = new Set(this.present);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.present = next;
  }

  togglePrintPick(id: number): void {
    const next = new Set(this.printPick);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.printPick = next;
  }

  toggleAllVisible(): void {
    const rows = this.filteredPeople();
    const next = new Set(this.present);
    const allOn = rows.length > 0 && rows.every(p => next.has(p.id));
    rows.forEach(p => allOn ? next.delete(p.id) : next.add(p.id));
    this.present = next;
  }

  toggleAllPrintVisible(): void {
    const rows = this.filteredPeople();
    const next = new Set(this.printPick);
    const allOn = rows.length > 0 && rows.every(p => next.has(p.id));
    rows.forEach(p => allOn ? next.delete(p.id) : next.add(p.id));
    this.printPick = next;
  }

  saveSession(): void {
    if (!this.canWrite || !this.sessionItemId) return;
    if (!this.sessionFile) {
      this.error = 'Adjunte el PDF del registro de asistencia.';
      return;
    }
    this.saving = true;
    this.error = '';
    this.ok = '';
    const attendees = this.sessionPeople.map(p => ({
      employeeId: p.id,
      present: this.present.has(p.id)
    }));
    const photos = this.sessionPhotos.map(p => p.file);
    this.api.createSession(this.ruc, {
      itemId: this.sessionItemId,
      sessionDate: this.sessionDate,
      place: this.sessionPlace,
      hours: this.sessionHours,
      facilitator: this.sessionFacilitator,
      notes: this.sessionNotes,
      attendees
    }, this.sessionFile, photos).subscribe({
      next: () => {
        const itemId = this.sessionItemId;
        const extra = this.data?.items?.find(i => i.id === itemId)?.origin === 'EVENTUAL';
        this.saving = false;
        this.showSession = false;
        this.sessionFile = null;
        this.clearSessionPhotos();
        if (extra) {
          this.tab = 'extras';
          this.extraOpenId = itemId;
        } else {
          this.tab = 'ingreso';
          this.ingresoOpenId = itemId;
        }
        this.ok = extra
          ? 'Asistencia guardada. Las personas capacitadas quedaron en Fuera de cronograma.'
          : 'Asistencia guardada. El registro quedó en Ingreso capacitaciones; los marcados salen de Faltantes.';
        this.load(this.selectedYear ?? undefined);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || err?.error?.error || 'No se pudo guardar la sesión.';
      }
    });
  }

  topicName(id: number | null): string {
    if (!id || !this.data?.items) return '';
    return this.data.items.find(i => i.id === id)?.name || '';
  }

  isDrill(it: TrainingItem): boolean {
    const t = (it.activityType || '').toUpperCase();
    if (t === 'SIMULACRO') return true;
    if (t === 'CAPACITACION' || t === 'ENTRENAMIENTO') return false;
    return (it.name || '').toUpperCase().includes('SIMULACRO');
  }

  isEntre(it: TrainingItem): boolean {
    const t = (it.activityType || '').toUpperCase();
    if (t === 'ENTRENAMIENTO') return true;
    if (t === 'CAPACITACION' || t === 'SIMULACRO') return false;
    return false;
  }

  isCapac(it: TrainingItem): boolean {
    if (this.isDrill(it) || this.isEntre(it)) return false;
    return true;
  }

  isInternal(it: TrainingItem): boolean {
    return (it.facilitatorType || 'INTERNO').toUpperCase() !== 'EXTERNO';
  }

  participantCount(it: TrainingItem): number | string {
    const n = this.topicPeople(it);
    return n > 0 ? n : '—';
  }

  docAudience(it: TrainingItem): string {
    return (it.audienceLabel || '').trim() || '—';
  }

  docMethodology(it: TrainingItem): string {
    return (it.methodology || '').trim() || '—';
  }

  docDuration(it: TrainingItem): string {
    return (it.duration || '').trim() || '—';
  }

  docPlace(it: TrainingItem): string {
    return (it.place || '').trim() || '—';
  }

  docStrategies(it: TrainingItem): string {
    return (it.materials || '').trim() || '—';
  }

  itemObjective(it: TrainingItem): string {
    return (it.description || '').replace(/^\[(ALERTA|LECCION|CLIENTE|URGENTE|CLIMA)\]\s*/i, '').trim();
  }

  get companyOwner(): string {
    return (this.data?.legalRepresentative || '').trim() || '—';
  }

  openDoc(): void {
    this.showMissingDoc = false;
    this.showWorkerDoc = false;
    this.showDoc = true;
  }

  closeDoc(): void {
    this.showDoc = false;
  }

  printDoc(): void {
    this.showDoc = true;
    this.printSheet(
      'main.doc-sheet.doc-sheet--a4, main.doc-sheet.doc-sheet--a3',
      [this.paperSize === 'A3' ? 'ssa-print-a3' : 'ssa-print-a4']
    );
  }

  setPaper(size: 'A4' | 'A3'): void {
    this.paperSize = size;
  }

  onValidatedFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file || !this.canWrite) return;
    this.uploadingDoc = true;
    this.error = '';
    this.ok = '';
    this.api.approveDocument(this.ruc, this.selectedYear, file).subscribe({
      next: (res) => {
        this.data = res;
        this.uploadingDoc = false;
        this.ok = 'Plan validado cargado. El cronograma queda aprobado.';
      },
      error: (err) => {
        this.uploadingDoc = false;
        this.error = err?.error?.message || 'No se pudo subir el PDF validado.';
      }
    });
  }

  get deletingItem(): TrainingItem | null {
    if (!this.deletingId || !this.data?.items) return null;
    return this.data.items.find(i => i.id === this.deletingId) || null;
  }

  askDelete(item: TrainingItem): void {
    if (!this.canWrite || !item?.id) return;
    this.deletingId = item.id;
  }

  cancelDelete(): void {
    this.deletingId = null;
  }

  confirmDelete(): void {
    if (!this.canWrite || !this.deletingId) return;
    this.deleting = true;
    this.error = '';
    this.api.deleteItem(this.ruc, this.deletingId).subscribe({
      next: () => {
        this.deleting = false;
        this.deletingId = null;
        this.ok = 'Tema eliminado del cronograma.';
        this.load(this.selectedYear ?? undefined);
      },
      error: (err) => {
        this.deleting = false;
        this.error = err?.error?.message || 'No se pudo eliminar el tema.';
      }
    });
  }

  setTab(tab: 'dashboard' | 'cronograma' | 'extras' | 'faltantes' | 'ingreso' | 'trabajador'): void {
    this.tab = tab;
    if (tab === 'trabajador' && !this.workers.length) this.loadWorkers();
  }

  loadWorkers(): void {
    if (!this.ruc) return;
    this.loadingWorkers = true;
    this.api.workers(this.ruc, this.selectedYear, this.workerFilter || undefined).subscribe({
      next: (rows) => {
        this.workers = rows || [];
        this.loadingWorkers = false;
        if (this.selectedWorker?.id) this.openWorker(this.selectedWorker.id, false);
      },
      error: () => {
        this.loadingWorkers = false;
        this.error = 'No se pudo cargar el personal.';
      }
    });
  }

  openWorker(employeeId: number, switchTab = true): void {
    if (!employeeId) return;
    this.closeDrawer();
    if (switchTab) this.tab = 'trabajador';
    this.loadingWorker = true;
    this.workerPhotoBroken = false;
    this.api.worker(this.ruc, employeeId, this.selectedYear).subscribe({
      next: (res) => {
        this.selectedWorker = res;
        this.loadingWorker = false;
      },
      error: () => {
        this.loadingWorker = false;
        this.error = 'No se pudo cargar el historial del trabajador.';
      }
    });
  }

  openWorkerDoc(): void {
    if (!this.selectedWorker) return;
    this.showDoc = false;
    this.showMissingDoc = false;
    this.showWorkerDoc = true;
    if (!this.workers.length) this.loadWorkers();
  }

  closeWorkerDoc(): void {
    this.showWorkerDoc = false;
  }

  printWorkerDoc(): void {
    this.showWorkerDoc = true;
    this.printSheet('.cart-sheet', ['ssa-print-cart']);
  }

  private printHost: HTMLElement | null = null;

  private printSheet(selector: string, extra: string[]): void {
    setTimeout(() => {
      const src = document.querySelector(selector) as HTMLElement | null;
      if (!src) return;
      this.clearPrintHost();
      const host = document.createElement('div');
      host.className = 'ssa-print-root';
      host.appendChild(src.cloneNode(true));
      document.body.appendChild(host);
      this.printHost = host;
      document.body.classList.add('ssa-print-doc', ...extra);
      const done = () => {
        window.removeEventListener('afterprint', done);
        document.body.classList.remove('ssa-print-doc', ...extra);
        this.clearPrintHost();
      };
      window.addEventListener('afterprint', done);
      window.print();
    }, 80);
  }

  private clearPrintHost(): void {
    this.printHost?.remove();
    this.printHost = null;
    document.querySelectorAll('body > .ssa-print-root').forEach(n => n.remove());
  }

  get workerPlanPercent(): number {
    const w = this.selectedWorker;
    if (!w) return 0;
    const tot = (w.received || 0) + (w.pending || 0);
    if (!tot) return 0;
    return Math.round(((w.received || 0) * 100) / tot);
  }

  workerRecordKind(r: TrainingReceived): string {
    const o = (r.origin || '').toUpperCase();
    const t = (r.activityType || '').toUpperCase();
    if (t === 'SIMULACRO' || (r.topicName || '').toUpperCase().includes('SIMULACRO')) return 'Simulacro';
    const it = (this.data?.items || []).find(i => i.id === r.itemId);
    if (it && (o === 'EVENTUAL' || it.origin === 'EVENTUAL')) {
      return this.extraKindMeta(it).label;
    }
    if (o === 'REINDUCCION') return 'Reinducción';
    if (t === 'ENTRENAMIENTO') return 'Entrenamiento';
    return 'Plan anual';
  }

  workerRecordKindClass(r: TrainingReceived): string {
    const k = this.workerRecordKind(r).toLowerCase();
    if (k.includes('simulacro')) return 'sim';
    if (k.includes('alerta')) return 'alert';
    if (k.includes('cliente')) return 'req';
    if (k.includes('lección') || k.includes('leccion')) return 'alert';
    if (k.includes('entrenamiento')) return 'ent';
    if (k.includes('reinducción') || k.includes('reinduccion') || k.includes('fuera')) return 'out';
    return 'plan';
  }

  workerRecordModality(r: TrainingReceived): string {
    const h = r.hours != null && r.hours > 0 ? `${r.hours}h` : '';
    const m = (r.methodology || '').trim();
    if (m && h) return `${m} · ${h}`;
    if (m) return m;
    const t = (r.activityType || '').toUpperCase();
    const label = t === 'ENTRENAMIENTO' ? 'Práctico' : t === 'SIMULACRO' ? 'Simulacro' : t === 'CAPACITACION' ? 'Presencial' : '';
    if (label && h) return `${label} · ${h}`;
    return h || '—';
  }

  workerEvidenceLabel(r: TrainingReceived): string {
    if (!r.evidenceUrl) return '—';
    const name = (r.evidenceUrl.split('/').pop() || 'Acta').split('?')[0];
    return name.length > 18 ? 'Con acta' : name;
  }

  workerRecordDate(raw?: string): string {
    if (!raw) return '—';
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      const [y, m, d] = raw.slice(0, 10).split('-');
      return `${d}/${m}/${y.slice(2)}`;
    }
    return raw;
  }

  get workerHoursLabel(): string {
    const w = this.selectedWorker;
    if (!w) return '0';
    if (w.hoursTotal && w.hoursTotal > 0) return String(w.hoursTotal);
    const sum = (w.records || []).reduce((acc, r) => acc + (Number(r.hours) || 0), 0);
    return String(sum);
  }

  get workerArea(): string {
    const w = this.selectedWorker;
    if (!w) return '—';
    const parts = [w.department, w.contractorCompany, w.block].map(s => (s || '').trim()).filter(Boolean);
    return parts.length ? parts.join(' · ') : '—';
  }

  get workerPhotoSrc(): string | null {
    if (this.workerPhotoBroken) return null;
    const raw = (this.selectedWorker?.photoUrl || '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('/api/')) return raw;
    let rel = raw.replace(/\\/g, '/').replace(/^\.?\/?/, '');
    if (rel.startsWith('uploads/')) rel = rel.substring('uploads/'.length);
    if (rel.startsWith('profiles/') || rel.includes('/profiles/')) return `/api/files/${rel}`;
    if (!rel.includes('/')) return `/api/files/profiles/${rel}`;
    return `/api/files/${rel}`;
  }

  get workerInitials(): string {
    const n = (this.selectedWorker?.fullName || '').trim();
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (n.slice(0, 2) || '—').toUpperCase();
  }

  get workerDocDate(): string {
    const d = new Date();
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  get workerDocCode(): string {
    const id = this.selectedWorker?.companyCode || this.selectedWorker?.id;
    return id ? `REG-SST-TRA-${id}` : 'REG-SST-TRA';
  }

  get workerStatusLabel(): string {
    const pending = this.selectedWorker?.pending || 0;
    return pending > 0 ? `${pending} tema(s) pendiente(s)` : 'Plan anual cubierto';
  }

  onWorkerPhotoError(): void {
    this.workerPhotoBroken = true;
  }

  onCartWorkerChange(raw: number | string): void {
    const id = Number(raw);
    if (id) this.openWorker(id, false);
  }

  openEvidence(url?: string | null): void {
    if (!url) return;
    this.api.evidence(url).subscribe({
      next: (blob) => {
        void this.showEvidence(url, blob);
      },
      error: () => (this.error = 'No se pudo abrir el registro de asistencia.')
    });
  }

  private async showEvidence(url: string, blob: Blob): Promise<void> {
    const type = await this.detectEvidenceMime(url, blob);
    const typed = new Blob([blob], { type });
    this.closePreview();
    this.previewUrl = URL.createObjectURL(typed);
    this.previewKind = type.startsWith('image/') ? 'image' : type === 'application/pdf' ? 'pdf' : 'other';
    const src = this.previewKind === 'pdf' ? `${this.previewUrl}#view=FitH&toolbar=1` : this.previewUrl;
    this.previewSafe = this.sanitizer.bypassSecurityTrustResourceUrl(src);
    if (this.previewKind === 'other') {
      const a = document.createElement('a');
      a.href = this.previewUrl;
      a.download = (url.split('/').pop() || 'archivo').split('?')[0];
      a.rel = 'noopener';
      a.click();
    }
  }

  closePreview(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
    this.previewSafe = null;
    this.previewKind = 'other';
  }

  private async detectEvidenceMime(url: string, blob: Blob): Promise<string> {
    try {
      const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
      if (head.length >= 4 && head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) {
        return 'application/pdf';
      }
      if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
      if (head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
        return 'image/png';
      }
      if (head.length >= 12 && head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46
          && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50) {
        return 'image/webp';
      }
    } catch { /* usa extensión / Content-Type */ }
    return this.evidenceMime(url, blob);
  }

  private evidenceMime(url: string, blob: Blob): string {
    const t = (blob.type || '').toLowerCase();
    if (t.startsWith('image/') || t === 'application/pdf') return t;
    const n = (url.split('?')[0] || '').toLowerCase();
    if (n.endsWith('.pdf')) return 'application/pdf';
    if (n.endsWith('.png')) return 'image/png';
    if (n.endsWith('.webp')) return 'image/webp';
    if (n.endsWith('.gif')) return 'image/gif';
    if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
    return t && t !== 'application/octet-stream' && t !== 'text/plain' ? t : 'application/octet-stream';
  }

  private formFromItem(it: TrainingItem) {
    const f = this.emptyForm();
    f.name = it.name || '';
    f.description = it.description || '';
    f.audienceCode = it.audienceCode || 'ALL';
    f.plannedCount = it.obligated ?? null;
    f.activityType = it.activityType
      || ((it.name || '').toUpperCase().includes('SIMULACRO') ? 'SIMULACRO' : 'CAPACITACION');
    f.facilitatorType = it.facilitatorType || 'INTERNO';
    f.methodology = it.methodology || 'Presencial';
    const d = (it.duration || '').toLowerCase();
    const num = parseFloat(d.replace(',', '.'));
    if (d.includes('jornada')) {
      f.durationUnit = 'Jornada';
      f.durationValue = 1;
    } else if (d.includes('min')) {
      f.durationUnit = 'Minutos';
      f.durationValue = Number.isFinite(num) ? num : 30;
    } else {
      f.durationUnit = 'Horas';
      f.durationValue = Number.isFinite(num) && num > 0 ? num : 1;
    }
    f.place = it.place || '';
    f.facilitator = it.facilitator || this.latestSession(it)?.facilitator || '';
    const raw = it.description || '';
    const kindMatch = raw.match(/^\[(ALERTA|LECCION|CLIENTE|URGENTE|CLIMA)\]\s*/);
    f.extraKind = kindMatch ? kindMatch[1] : (it.origin === 'EVENTUAL' ? 'ALERTA' : '');
    f.description = kindMatch ? raw.replace(/^\[(ALERTA|LECCION|CLIENTE|URGENTE|CLIMA)\]\s*/, '') : raw;
    const mat = (it.materials || '').toLowerCase();
    f.matVideos = mat.includes('video');
    f.matPpt = mat.includes('ppt') || mat.includes('present');
    f.matKit = mat.includes('práct') || mat.includes('pract') || mat.includes('kit');
    f.matExam = mat.includes('evalu');
    f.months = [...(it.months || [])];
    return f;
  }

  private emptyForm() {
    return {
      name: '',
      description: '',
      extraKind: 'ALERTA' as string,
      extraDate: new Date().toISOString().slice(0, 10),
      audienceCode: 'ALL',
      plannedCount: null as number | null,
      activityType: 'CAPACITACION',
      facilitatorType: 'INTERNO',
      facilitator: '',
      methodology: 'Presencial',
      durationValue: 1,
      durationUnit: 'Horas',
      place: '',
      matVideos: true,
      matPpt: true,
      matKit: false,
      matExam: false,
      months: [] as number[]
    };
  }
}
