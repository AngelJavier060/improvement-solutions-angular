import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { InventoryProductService, InventoryProduct } from '../../../../../services/inventory-product.service';
import { InventoryVariantService, InventoryVariant } from '../../../../../services/inventory-variant.service';
import { InventoryVariantAttributeService, VariantAttribute } from '../../../../../services/inventory-variant-attribute.service';
import { InventorySupplierService, InventorySupplier } from '../../../../../services/inventory-supplier.service';
import { InventoryCategoryService, InventoryCategory } from '../../../../../services/inventory-category.service';
import { InventoryEntryService, InventoryEntry } from '../../../../../services/inventory-entry.service';
import { FileService } from '../../../../../services/file.service';
import { AuthService } from '../../../../../core/services/auth.service';
import {
  INVENTORY_SECTIONS_BY_KIND,
  InventoryProductKind,
  InventoryProductSection,
  inventorySectionLabel
} from '../../../../../shared/inventory-product-sections';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-catalogo-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './catalogo-productos.component.html',
  styleUrls: ['./catalogo-productos.component.scss']
})
export class CatalogoProductosComponent implements OnInit {
  ruc: string = '';
  products: InventoryProduct[] = [];
  loading = false;
  errorMessage = '';
  /** Error visible dentro del panel de editar/crear (el de arriba a veces queda tapado). */
  formPanelError = '';
  successMessage = '';
  canWrite = false;
  /** El nombre se está sincronizando desde la sección (el usuario no lo escribió a mano). */
  nameAutoFromSection = true;

  // Filtros
  searchTerm = '';
  filterCategory = '';
  filterSection = '';
  filterStatus = 'ACTIVO';
  /** Tab / filtro por código de familia de la empresa ('' = todos). */
  filterFamilyCode = '';
  /** @deprecated alias interno; el filtro real es filterFamilyCode */
  filterKind: '' | InventoryProductKind = '';
  kindTabs: { code: string; label: string; icon: string }[] = [
    { code: '', label: 'Todos', icon: 'apps' }
  ];
  /** Familias asignadas a la empresa (todas las que tenga: 2, 4, 10…). */
  companyFamilyOptions: { code: string; label: string; productKind: InventoryProductKind }[] = [];
  /** Código corto SKU → productKind operativo (para el backend). */
  private productKindByFamilyCode: Record<string, InventoryProductKind> = {};
  private familyLabelByCode: Record<string, string> = {};
  /** Secciones de la empresa (todas las asignadas). */
  private companySectionsFlat: InventoryProductSection[] = [];
  subcategoryOptions: InventoryProductSection[] = [...INVENTORY_SECTIONS_BY_KIND.EPP];
  bodegaParamsLoaded = false;
  bodegaParamsError = '';

  categories: InventoryCategory[] = [];
  categoryNames: string[] = [];
  categoryStockTotals: { [name: string]: number } = {};
  private loadingCategoryTotals = new Set<string>();

  // Modal de detalle
  selectedProduct: InventoryProduct | null = null;
  productVariants: InventoryVariant[] = [];
  // Gestión de variantes (en modal)
  variantForm!: FormGroup;
  editingVariant: InventoryVariant | null = null;
  showVariantForm = false;
  /** Ingreso rápido de stock sin salir del modal de producto. */
  quickStockVariantId: number | null = null;
  quickStockQty: number | null = null;
  quickStockUnitCost: number | null = 0;
  quickStockLotNumber: string = '';
  quickStockManufacturingDate: string = '';
  quickStockExpirationDate: string = '';
  quickStockLocation: string = '';
  quickStockBusy = false;
  /** PDF ficha técnica pendiente de subir (variante). */
  variantTechSheetFile: File | null = null;
  variantTechSheetName = '';
  variantTechSheetExisting = '';
  variantTechSheetBusy = false;

  // Formulario (columna izquierda)
  productForm!: FormGroup;
  editingProductId: number | null = null;
  suppliers: InventorySupplier[] = [];
  statusOptions = ['ACTIVO', 'INACTIVO', 'DESCONTINUADO'];

  // Atributos de variante (para el formulario)
  attrRows: { name: string; value: string; id?: number }[] = [];
  variantAttributes: { [variantId: number]: VariantAttribute[] } = {};
  /** Marca de la variante (se guarda como atributo "Marca"). */
  variantBrand = '';

  // Subida de imagen
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;

  // Panel de formulario de producto
  showProductForm = false;
  panelPos = { x: 0, y: 0 };
  private dragging = false;
  private dragStart = { x: 0, y: 0 };
  private panelStart = { x: 0, y: 0 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private productService: InventoryProductService,
    private variantService: InventoryVariantService,
    private attrService: InventoryVariantAttributeService,
    private supplierService: InventorySupplierService,
    private categoryService: InventoryCategoryService,
    private entryService: InventoryEntryService,
    private fileService: FileService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.ruc = this.route.parent?.snapshot.params['ruc'] || '';
    this.canWrite = this.auth.canWrite();
    this.initForm();
    this.initVariantForm();
    this.loadBodegaParams();
    this.loadProducts();
    // Cargar listas globales (se reflejan las pantallas de configuración)
    this.loadSuppliers();
    this.loadCategories();
  }

  /**
   * Familia / Sección / códigos asignados a esta empresa
   * (Admin → Empresas → Inventario-Bodega).
   */
  private loadBodegaParams(): void {
    if (!this.ruc) return;
    this.bodegaParamsError = '';
    this.productService.getBodegaParams(this.ruc).subscribe({
      next: (params) => {
        this.applyBodegaParams(params?.families || [], params?.sections || []);
        this.bodegaParamsLoaded = true;
      },
      error: (err) => {
        this.bodegaParamsLoaded = true;
        this.bodegaParamsError = err?.error?.message || 'No se pudieron cargar Familia/Sección de la empresa';
        this.applyDefaultBodegaFallback();
      }
    });
  }

  private applyDefaultBodegaFallback(): void {
    const defaults = [
      { code: 'EPP', label: 'EPP', productKind: 'EPP' as InventoryProductKind },
      { code: 'HER', label: 'Herramientas', productKind: 'HERRAMIENTA' as InventoryProductKind },
      { code: 'PIE', label: 'Piezas', productKind: 'PIEZA' as InventoryProductKind }
    ];
    this.applyFamilyOptions(defaults);
    this.companySectionsFlat = [];
    this.subcategoryOptions = [...INVENTORY_SECTIONS_BY_KIND.EPP];
  }

  /** Mapea código/nombre de familia al enum operativo del backend (EPP|HERRAMIENTA|PIEZA). */
  private mapFamilyCodeToKind(code: string, name?: string): InventoryProductKind {
    const c = (code || '').toString().trim().toUpperCase();
    const n = (name || '').toString().trim().toUpperCase();
    if (c === 'EPP' || n.includes('EPP') || n.includes('PROTECCION')) return 'EPP';
    if (c === 'HER' || c === 'HERR' || c.startsWith('HER') || n.includes('HERRAMIENT') || c === 'HERRAMIENTA') return 'HERRAMIENTA';
    if (c === 'PIE' || c.startsWith('PIE') || n.includes('PIEZA') || n.includes('REPUESTO') || c === 'PIEZA') return 'PIEZA';
    // Familia personalizada de la empresa: por defecto EPP (entrega) para el backend.
    return 'EPP';
  }

  private familyIcon(kind: InventoryProductKind): string {
    if (kind === 'HERRAMIENTA') return 'build';
    if (kind === 'PIEZA') return 'settings';
    return 'health_and_safety';
  }

  private applyFamilyOptions(families: { code: string; label: string; productKind: InventoryProductKind }[]): void {
    this.companyFamilyOptions = families;
    this.productKindByFamilyCode = {};
    this.familyLabelByCode = {};
    for (const f of families) {
      this.productKindByFamilyCode[f.code] = f.productKind;
      this.familyLabelByCode[f.code] = f.label;
    }
    this.kindTabs = [
      { code: '', label: 'Todos', icon: 'apps' },
      ...families.map(f => ({
        code: f.code,
        label: f.label,
        icon: this.familyIcon(f.productKind)
      }))
    ];
  }

  private applyBodegaParams(
    families: { id?: number; name?: string; code?: string }[],
    sections: { id?: number; name?: string; code?: string }[]
  ): void {
    // Todas las familias de la empresa (sin colapsar a 3 tipos).
    const mappedFamilies: { code: string; label: string; productKind: InventoryProductKind }[] = [];
    const seenCodes = new Set<string>();
    for (const f of families || []) {
      const code = (f.code || '').toString().trim().toUpperCase();
      if (!code || seenCodes.has(code)) continue;
      seenCodes.add(code);
      mappedFamilies.push({
        code,
        label: (f.name || code).toString().trim() || code,
        productKind: this.mapFamilyCodeToKind(code, f.name)
      });
    }

    if (mappedFamilies.length) {
      this.applyFamilyOptions(mappedFamilies);
    } else {
      this.applyDefaultBodegaFallback();
    }

    const companySecs: InventoryProductSection[] = (sections || [])
      .map(s => ({
        prefix: (s.code || '').toString().trim().toUpperCase(),
        label: (s.name || s.code || '').toString().trim()
      }))
      .filter(s => !!s.prefix);

    // Deduplicar por código de sección
    const seenSec = new Set<string>();
    this.companySectionsFlat = companySecs.filter(s => {
      if (seenSec.has(s.prefix)) return false;
      seenSec.add(s.prefix);
      return true;
    });

    this.subcategoryOptions = this.companySectionsFlat.length
      ? [...this.companySectionsFlat]
      : [...INVENTORY_SECTIONS_BY_KIND.EPP];

    if (this.productForm && !this.fillingForm) {
      const currentFamily = (this.productForm.get('familyCode')?.value || '').toString().toUpperCase();
      const firstFamily = this.companyFamilyOptions[0]?.code || 'EPP';
      const familyOk = this.companyFamilyOptions.some(f => f.code === currentFamily) ? currentFamily : firstFamily;
      const kind = this.productKindByFamilyCode[familyOk] || 'EPP';
      const sec = (this.productForm.get('sectionCode')?.value || '').toString();
      const firstSec = this.subcategoryOptions[0]?.prefix || 'OTR';
      const secOk = this.subcategoryOptions.some(s => s.prefix === sec) ? sec : firstSec;
      this.productForm.patchValue({
        familyCode: familyOk,
        productKind: kind,
        sectionCode: secOk,
        subcategoryPrefix: secOk
      }, { emitEvent: false });
    }
  }

  /** Código SKU de la familia seleccionada (o la indicada). */
  familySkuCode(familyCode?: string): string {
    const code = (familyCode || this.productForm?.get('familyCode')?.value || this.companyFamilyOptions[0]?.code || 'EPP')
      .toString()
      .trim()
      .toUpperCase();
    return code || 'EPP';
  }

  /** productKind operativo del backend según familia. */
  productKindForFamily(familyCode?: string): InventoryProductKind {
    const code = this.familySkuCode(familyCode);
    return this.productKindByFamilyCode[code] || this.mapFamilyCodeToKind(code);
  }

  private generateVariantCode(product: InventoryProduct): string {
    const base = (product.code || 'SKU').toString();
    let max = 0;
    (this.productVariants || []).forEach(v => {
      const c = (v.code || '').toString();
      const m = c.match(/-(\d{1,})$/);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) max = Math.max(max, n);
      }
    });
    const next = String(max + 1).padStart(2, '0');
    return `${base}-${next}`;
  }

  private toNum(val: any): number {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const n = parseFloat(val.replace(/,/g, '.'));
      return isNaN(n) ? 0 : n;
    }
    // Intentar BigDecimal serializado como objeto { value: "123.45" }
    const maybe = (val as any).value ?? (val as any)._value ?? null;
    if (maybe != null) {
      const n = parseFloat(String(maybe).replace(/,/g, '.'));
      return isNaN(n) ? 0 : n;
    }
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  // ====== UTILIDADES PARA CÓDIGOS ======
  private normalizePrefix(text: string, fallback: string = 'PRD'): string {
    try {
      if (!text) return fallback;
      const cleaned = text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim();
      if (!cleaned) return fallback;
      const firstWord = cleaned.split(/\s+/)[0];
      return firstWord.substring(0, 3).toUpperCase();
    } catch { return fallback; }
  }

  private deriveCategoryPrefix(categoryName: string): string {
    return this.familySkuCode();
  }

  /** Prefijo de familia del SKU del producto (FAM-SEC-###). */
  getProductFamilyCode(p: InventoryProduct): string {
    const code = (p.code || '').toString().trim().toUpperCase();
    const m = code.match(/^([A-Z0-9]{2,4})-/);
    if (m && m[1]) return m[1];

    // Fallback sin llamar a getProductKind (evita recursión).
    const k = (p.productKind || '').toString().toUpperCase();
    if (k === 'HERRAMIENTA' || k === 'PIEZA' || k === 'EPP') {
      const byKind = (this.companyFamilyOptions || []).find(f => f.productKind === k);
      if (byKind?.code) return byKind.code;
      return k === 'HERRAMIENTA' ? 'HER' : k === 'PIEZA' ? 'PIE' : 'EPP';
    }
    return this.companyFamilyOptions[0]?.code || 'EPP';
  }

  getProductKind(p: InventoryProduct): 'EPP' | 'HERRAMIENTA' | 'PIEZA' {
    const k = (p.productKind || '').toString().toUpperCase();
    if (k === 'HERRAMIENTA' || k === 'PIEZA' || k === 'EPP') return k;

    // Inferir por prefijo del SKU (sin getProductFamilyCode → getProductKind).
    const code = (p.code || '').toString().trim().toUpperCase();
    const m = code.match(/^([A-Z0-9]{2,4})-/);
    if (m && m[1] && this.productKindByFamilyCode[m[1]]) {
      return this.productKindByFamilyCode[m[1]];
    }
    if (code.startsWith('HER-') || code.startsWith('HERR-')) return 'HERRAMIENTA';
    if (code.startsWith('PIE-')) return 'PIEZA';
    if (code.startsWith('EPP-')) return 'EPP';

    const cat = this.getProductCategory(p).toUpperCase();
    if (cat.includes('HERRAMIENT')) return 'HERRAMIENTA';
    if (cat.includes('PIEZA') || cat.includes('REPUESTO')) return 'PIEZA';
    return 'EPP';
  }

  kindLabel(kindOrCode: string): string {
    const key = (kindOrCode || '').toString().toUpperCase();
    if (this.familyLabelByCode[key]) return this.familyLabelByCode[key];
    const byKind = (this.companyFamilyOptions || []).find(f => f.productKind === key || f.code === key);
    if (byKind?.label) return byKind.label;
    if (key === 'HERRAMIENTA') return 'Herramienta';
    if (key === 'PIEZA') return 'Pieza';
    return key || 'EPP';
  }

  setFilterKind(familyCode: string): void {
    this.filterFamilyCode = (familyCode || '').toString().toUpperCase();
    // Compat: si el tab es un productKind antiguo
    if (this.filterFamilyCode === 'HERRAMIENTA' || this.filterFamilyCode === 'PIEZA' || this.filterFamilyCode === 'EPP') {
      const mapped = (this.companyFamilyOptions || []).find(f => f.productKind === this.filterFamilyCode);
      if (mapped) this.filterFamilyCode = mapped.code;
    }
    this.filterKind = '' as any;
    this.filterSection = '';
  }

  getSectionOptionsForFilter(): { prefix: string; label: string }[] {
    if (this.companySectionsFlat.length) return [...this.companySectionsFlat];
    return [
      ...INVENTORY_SECTIONS_BY_KIND.EPP,
      ...INVENTORY_SECTIONS_BY_KIND.HERRAMIENTA,
      ...INVENTORY_SECTIONS_BY_KIND.PIEZA
    ];
  }

  getProductSectionCode(p: InventoryProduct): string {
    const code = (p.sectionCode || '').toString().trim().toUpperCase();
    if (code) return code;
    const fromSku = this.extractSubPrefixFromCode(p.code || '');
    return (fromSku || '').toUpperCase();
  }

  getProductSectionLabel(p: InventoryProduct): string {
    if (p.sectionLabel) return p.sectionLabel;
    const code = this.getProductSectionCode(p);
    if (!code) return '—';
    const found = (this.subcategoryOptions || []).find(s => s.prefix === code)
      || (this.companySectionsFlat || []).find(s => s.prefix === code);
    return found?.label || inventorySectionLabel(code) || code;
  }

  sectionLabelForPrefix(prefix: string): string {
    const p = (prefix || '').toUpperCase();
    const fromCompany = (this.companySectionsFlat || []).find(s => s.prefix === p);
    if (fromCompany) return fromCompany.label;
    const fromOpts = (this.subcategoryOptions || []).find(s => s.prefix === p);
    if (fromOpts) return fromOpts.label;
    return inventorySectionLabel(prefix);
  }

  /** Nombres genéricos no válidos como producto concreto. */
  isGenericProductName(name: string): boolean {
    const n = (name || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    const banned = new Set([
      'epp',
      'equipo de proteccion personal',
      'equipos de proteccion personal',
      'equipo de proteccion',
      'equipos de proteccion',
      'herramienta',
      'herramientas',
      'pieza',
      'piezas',
      'producto',
      'producto general',
      'general',
      'varios',
      'equipo',
      'equipos'
    ]);
    return banned.has(n);
  }

  /** Nombre sugerido según sección (la marca va en la variante, no aquí). */
  suggestedConcreteName(): string {
    const section = (this.productForm?.get('sectionCode')?.value || 'OTR').toString().toUpperCase();
    const label = this.sectionLabelForPrefix(section);
    if (!label || label === '—') return 'Producto';
    return label;
  }

  applySuggestedProductName(): void {
    const name = this.suggestedConcreteName();
    this.productForm.patchValue({ name });
    this.nameAutoFromSection = true;
    this.formPanelError = '';
    this.errorMessage = '';
  }

  /** Si el nombre sigue siendo el de la sección (o genérico), al cambiar sección se actualiza solo. */
  private syncNameFromSectionIfNeeded(): void {
    if (this.fillingForm) return;
    const current = (this.productForm.get('name')?.value || '').toString().trim();
    if (!current || this.isGenericProductName(current) || this.nameAutoFromSection) {
      this.applySuggestedProductName();
    }
  }

  countByKind(familyCode: string): number {
    if (!familyCode) return this.products.length;
    const code = familyCode.toUpperCase();
    return this.products.filter(p => this.getProductFamilyCode(p) === code).length;
  }

  /** Evita que valueChanges pise valores al rellenar el formulario de edición. */
  private fillingForm = false;

  /**
   * Elige la categoría del catálogo que mejor encaja con el tipo operativo.
   * No son el mismo campo, pero en la práctica deben ir alineados.
   */
  resolveCategoryNameForKind(kind: 'EPP' | 'HERRAMIENTA' | 'PIEZA', preferred?: string): string {
    const list = this.categories || [];
    const pref = (preferred || '').trim();
    if (pref) {
      const exact = list.find(c => (c.name || '').trim().toLowerCase() === pref.toLowerCase());
      if (exact?.name) return exact.name;
    }
    const score = (name: string): number => {
      const n = (name || '').toLowerCase();
      if (kind === 'EPP') {
        if (n === 'epp') return 100;
        if (n.includes('proteccion') && n.includes('personal')) return 90;
        if (n.includes('epp')) return 80;
        return 0;
      }
      if (kind === 'HERRAMIENTA') {
        if (n.includes('herramient')) return 100;
        if (n.includes('equipo')) return 70;
        return 0;
      }
      // PIEZA
      if (n.includes('pieza') || n.includes('repuesto')) return 100;
      if (n.includes('consumible')) return 70;
      return 0;
    };
    let best: string | null = null;
    let bestScore = 0;
    for (const c of list) {
      const s = score(c.name || '');
      if (s > bestScore) {
        bestScore = s;
        best = c.name || null;
      }
    }
    if (best) return best;
    // Fallbacks si aún no cargó el catálogo
    if (kind === 'HERRAMIENTA') return pref || 'Equipos y Herramientas';
    if (kind === 'PIEZA') return pref || 'Piezas';
    return pref || 'EPP';
  }

  private ensureCategoryOption(name: string): void {
    const n = (name || '').trim();
    if (!n) return;
    const exists = (this.categories || []).some(c => (c.name || '').trim().toLowerCase() === n.toLowerCase());
    if (!exists) {
      this.categories = [...(this.categories || []), { name: n } as InventoryCategory]
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }

  onProductKindChange(): void {
    // Secciones son las de la empresa (todas), no dependen de la familia.
    this.subcategoryOptions = this.companySectionsFlat.length
      ? [...this.companySectionsFlat]
      : [...INVENTORY_SECTIONS_BY_KIND.EPP];
    const familyCode = this.familySkuCode();
    const kind = this.productKindForFamily(familyCode);
    const current = (this.productForm.get('sectionCode')?.value || this.productForm.get('subcategoryPrefix')?.value || '').toString();
    if (!this.subcategoryOptions.some(s => s.prefix === current)) {
      this.productForm.patchValue({
        sectionCode: this.subcategoryOptions[0]?.prefix || 'OTR',
        subcategoryPrefix: this.subcategoryOptions[0]?.prefix || 'OTR'
      }, { emitEvent: false });
    }
    this.productForm.patchValue({ productKind: kind, familyCode }, { emitEvent: false });
    // Alinear categoría con el tipo (salvo al rellenar edición: ahí se respeta lo guardado).
    if (!this.fillingForm) {
      const matched = this.resolveCategoryNameForKind(kind);
      this.ensureCategoryOption(matched);
      this.productForm.patchValue({ categoryName: matched }, { emitEvent: false });
      this.syncNameFromSectionIfNeeded();
      // Al crear: siempre el siguiente código consecutivo de la familia/sección.
      if (!this.editingProductId) {
        this.suggestCode(false);
      }
    }
  }

  /** Selección de familia desde el formulario (por código de empresa). */
  selectFamily(familyCode: string): void {
    const code = (familyCode || '').toString().trim().toUpperCase();
    const kind = this.productKindForFamily(code);
    this.productForm.patchValue({ familyCode: code, productKind: kind });
    this.onProductKindChange();
  }

  variantSizeLabel(): string {
    const kind = this.selectedProduct ? this.getProductKind(this.selectedProduct) : 'EPP';
    if (kind === 'HERRAMIENTA') return 'Identificador / serie interna';
    if (kind === 'PIEZA') return 'Medida / referencia';
    return 'Talla';
  }

  private deriveSubcategoryPrefixFromName(productName: string): string {
    return this.normalizePrefix(productName, 'GEN');
  }

  private extractSubPrefixFromCode(code: string): string | null {
    if (!code) return null;
    const m = code.toUpperCase().match(/^[A-Z0-9]{2,4}-([A-Z0-9]{2,4})-\d{1,}$/);
    return m ? m[1] : null;
  }

  private escapeRegExp(text: string): string {
    return (text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Siguiente correlativo libre para FAM-SEC-### (excluye el producto en edición). */
  private nextProductSequence(catPrefix: string, subPrefix: string): number {
    const fam = this.escapeRegExp((catPrefix || '').toUpperCase());
    const sec = this.escapeRegExp((subPrefix || '').toUpperCase());
    const pattern = new RegExp(`^${fam}-${sec}-([0-9]{1,})$`, 'i');
    let maxSeq = 0;
    const excludeId = this.editingProductId;
    (this.products || []).forEach(p => {
      if (excludeId && p.id === excludeId) return;
      const code = (p.code || '').toString().toUpperCase();
      const m = code.match(pattern);
      if (m && m[1]) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n)) maxSeq = Math.max(maxSeq, n);
      }
    });
    return maxSeq + 1;
  }

  private pad3(n: number): string { return String(n).padStart(3, '0'); }

  private normalizeCode(code: string): string {
    return (code || '').toString().trim().toUpperCase();
  }

  private normalizeName(name: string): string {
    return (name || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  /** ¿El código ya existe en la empresa? */
  isCodeTaken(code: string, excludeId?: number | null): boolean {
    const c = this.normalizeCode(code);
    if (!c) return false;
    const skip = excludeId ?? this.editingProductId;
    return (this.products || []).some(p => {
      if (skip && p.id === skip) return false;
      return this.normalizeCode(p.code || '') === c;
    });
  }

  /** ¿El nombre ya existe en la empresa? */
  isNameTaken(name: string, excludeId?: number | null): boolean {
    const n = this.normalizeName(name);
    if (!n) return false;
    const skip = excludeId ?? this.editingProductId;
    return (this.products || []).some(p => {
      if (skip && p.id === skip) return false;
      return this.normalizeName(p.name || '') === n;
    });
  }

  private notifyDuplicate(message: string): void {
    this.formPanelError = message;
    this.errorMessage = message;
    this.successMessage = '';
  }

  /** Código consecutivo siguiente (FAM-SEC-###) garantizando que no esté tomado. */
  buildNextConsecutiveCode(familyCode?: string, sectionCode?: string): string {
    const fam = this.normalizeCode(familyCode || this.familySkuCode());
    const sec = this.normalizeCode(
      sectionCode
      || this.productForm?.get('sectionCode')?.value
      || this.productForm?.get('subcategoryPrefix')?.value
      || 'OTR'
    );
    let seq = this.nextProductSequence(fam, sec);
    let candidate = `${fam}-${sec}-${this.pad3(seq)}`;
    // Por si hay huecos o códigos fuera de patrón: avanzar hasta uno libre.
    let guard = 0;
    while (this.isCodeTaken(candidate) && guard < 9999) {
      seq += 1;
      candidate = `${fam}-${sec}-${this.pad3(seq)}`;
      guard += 1;
    }
    return candidate;
  }

  suggestCode(showNotice = false): void {
    const next = this.buildNextConsecutiveCode();
    this.productForm.patchValue({ code: next }, { emitEvent: false });
    if (showNotice) {
      this.successMessage = `Código asignado automáticamente: ${next}`;
      this.formPanelError = '';
    }
  }

  /** Al salir del campo código: avisa si está repetido y propone el siguiente. */
  onCodeBlur(): void {
    if (this.fillingForm || !this.showProductForm) return;
    const code = this.normalizeCode(this.productForm.get('code')?.value || '');
    if (!code) return;
    if (this.isCodeTaken(code)) {
      const next = this.buildNextConsecutiveCode();
      this.notifyDuplicate(
        `El código “${code}” ya existe. Se asignó el siguiente consecutivo: ${next}`
      );
      this.productForm.patchValue({ code: next }, { emitEvent: false });
    }
  }

  /** Al salir del campo nombre: avisa si está repetido. */
  onNameBlur(): void {
    if (this.fillingForm || !this.showProductForm) return;
    const name = (this.productForm.get('name')?.value || '').toString().trim();
    if (!name || this.isGenericProductName(name)) return;
    if (this.isNameTaken(name)) {
      this.notifyDuplicate(
        `El nombre “${name}” ya existe en el catálogo. Debe ser único; cámbialo para continuar.`
      );
    }
  }

  loadProducts(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.productService.list(this.ruc).subscribe({
      next: (data) => {
        this.products = data;
        this.extractCategories();
        this.categoryStockTotals = {};
        this.loadingCategoryTotals.clear();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Error al cargar los productos';
        this.loading = false;
      }
    });
  }

  extractCategories(): void {
    const cats = new Set<string>();
    this.products.forEach(p => {
      const name = this.getProductCategory(p);
      if (name) cats.add(name);
    });
    this.categoryNames = Array.from(cats).sort();
  }

  getProductCategory(p: InventoryProduct): string {
    if (p.categoryRef?.name) return p.categoryRef.name;
    return p.category || '';
  }

  getCategoryTotal(name: string): number | null {
    if (name in this.categoryStockTotals) return this.categoryStockTotals[name];
    this.computeCategoryTotal(name);
    return null;
  }

  private computeCategoryTotal(name: string): void {
    if (!name && name !== '') return;
    if (name in this.categoryStockTotals) return;
    if (this.loadingCategoryTotals.has(name)) return;
    const productIds = this.products
      .filter(p => this.getProductCategory(p) === name)
      .map(p => p.id)
      .filter((id): id is number => !!id);
    if (!productIds.length) {
      this.categoryStockTotals[name] = 0;
      return;
    }
    this.loadingCategoryTotals.add(name);
    const calls = productIds.map(id => this.variantService.listByProduct(this.ruc, id).pipe(catchError(() => of([] as any[]))));
    forkJoin(calls).subscribe({
      next: (results: any[][]) => {
        let total = 0;
        results.forEach(arr => {
          const list = Array.isArray(arr) ? arr : [];
          list.forEach(v => {
            total += this.toNum((v as any).currentQty);
          });
        });
        this.categoryStockTotals[name] = total;
        this.loadingCategoryTotals.delete(name);
      },
      error: () => {
        this.categoryStockTotals[name] = 0;
        this.loadingCategoryTotals.delete(name);
      }
    });
  }

  getFilteredProducts(): InventoryProduct[] {
    return this.products.filter(p => {
      const catName = this.getProductCategory(p);
      const section = this.getProductSectionCode(p);
      const sectionLabel = this.getProductSectionLabel(p);
      const matchesSearch = !this.searchTerm ||
        p.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.code?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        sectionLabel.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        catName.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesCategory = !this.filterCategory || catName === this.filterCategory;
      const matchesSection = !this.filterSection || section === this.filterSection;
      const matchesStatus = !this.filterStatus || p.status === this.filterStatus;
      const fam = this.getProductFamilyCode(p);
      const matchesKind = !this.filterFamilyCode || fam === this.filterFamilyCode;

      return matchesSearch && matchesCategory && matchesSection && matchesStatus && matchesKind;
    });
  }

  selectProduct(product: InventoryProduct): void {
    this.selectedProduct = product;
    this.loadVariants(product.id!);
    this.showVariantForm = false;
    this.editingVariant = null;
    this.variantForm.reset({ code: '', sizeLabel: '', dimensions: '', salePrice: 0, minQty: 0, generalSpecs: '' });
  }

  loadVariants(productId: number): void {
    this.variantService.listByProduct(this.ruc, productId).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        this.productVariants = list.map(v => ({
          ...v,
          currentQty: this.toNum((v as any).currentQty),
          minQty: this.toNum((v as any).minQty),
          salePrice: this.toNum((v as any).salePrice)
        }));
        // Load attributes for each variant
        this.productVariants.forEach(v => { if (v.id) this.loadVariantAttributes(v.id); });
      },
      error: () => this.productVariants = []
    });
  }

  loadVariantAttributes(variantId: number): void {
    this.attrService.list(this.ruc, variantId).subscribe({
      next: (attrs) => { this.variantAttributes[variantId] = attrs || []; },
      error: () => { this.variantAttributes[variantId] = []; }
    });
  }

  getVariantAttributes(variantId?: number): VariantAttribute[] {
    if (!variantId) return [];
    return this.variantAttributes[variantId] || [];
  }

  addAttrRow(): void {
    this.attrRows.push({ name: '', value: '' });
  }

  removeAttrRow(i: number): void {
    this.attrRows.splice(i, 1);
  }

  viewProductDetails(product: InventoryProduct, event: Event): void {
    event.stopPropagation();
    this.selectProduct(product);
  }

  getVariantCount(productId: number): number {
    // Esto es un placeholder, idealmente debería venir del backend
    return 0;
  }

  editProduct(product: InventoryProduct): void {
    this.openEditProductForm(product);
  }

  openNewProductForm(): void {
    if (!this.canWrite) {
      this.errorMessage = 'Modo solo consulta: no puedes crear ni editar productos.';
      return;
    }
    this.cancelEdit();
    this.showProductForm = true;
    this.loadSuppliers();
    this.loadCategories();
    this.setDefaultPanelPosition();
    const preferred = (this.filterFamilyCode || this.companyFamilyOptions[0]?.code || 'EPP').toUpperCase();
    const family = this.companyFamilyOptions.find(f => f.code === preferred) || this.companyFamilyOptions[0];
    const familyCode = family?.code || 'EPP';
    const kind = family?.productKind || this.productKindForFamily(familyCode);
    const cat = this.resolveCategoryNameForKind(kind);
    this.ensureCategoryOption(cat);
    this.subcategoryOptions = this.companySectionsFlat.length
      ? [...this.companySectionsFlat]
      : [...INVENTORY_SECTIONS_BY_KIND.EPP];
    const section = this.subcategoryOptions[0]?.prefix || 'OTR';
    this.productForm.patchValue({
      familyCode,
      productKind: kind,
      categoryName: cat,
      sectionCode: section,
      subcategoryPrefix: section,
      unitOfMeasure: 'UND',
      status: 'ACTIVO',
      name: this.sectionLabelForPrefix(section)
    });
    this.nameAutoFromSection = true;
    this.onProductKindChange();
    this.applySuggestedProductName();
    this.suggestCode(false);
  }

  openEditProductForm(product: InventoryProduct): void {
    if (!this.canWrite) {
      this.errorMessage = 'Modo solo consulta: no puedes editar productos.';
      return;
    }
    this.selectedProduct = null;
    this.loadSuppliers();
    this.setDefaultPanelPosition();
    const apply = (p: InventoryProduct) => {
      this.fillForm(p);
      this.showProductForm = true;
      // Recargar categorías y reaplicar lo guardado (evita que el select quede en blanco).
      this.loadCategories(() => this.reapplyEditingCategory(p));
    };
    if (product?.id) {
      this.productService.getById(this.ruc, product.id).subscribe({
        next: (full) => apply(full || product),
        error: () => apply(product)
      });
    } else {
      apply(product);
    }
  }

  /** Tras cargar el combo de categorías, deja seleccionada la del producto en BD. */
  private reapplyEditingCategory(p: InventoryProduct): void {
    if (!this.editingProductId) return;
    const familyCode = this.getProductFamilyCode(p);
    const kind = this.getProductKind(p);
    let catName = '';
    if (p.category && String(p.category).trim()) catName = String(p.category).trim();
    else if (p.categoryRef?.name) catName = p.categoryRef.name;
    else if ((p as any).categoryRef?.id) {
      const found = this.categories.find(c => c.id === (p as any).categoryRef.id);
      catName = found?.name || '';
    }
    if (!catName) catName = this.resolveCategoryNameForKind(kind);
    this.ensureCategoryOption(catName);
    this.subcategoryOptions = this.companySectionsFlat.length
      ? [...this.companySectionsFlat]
      : [...INVENTORY_SECTIONS_BY_KIND.EPP];
    const section = this.getProductSectionCode(p) || this.subcategoryOptions[0]?.prefix || 'OTR';
    this.fillingForm = true;
    this.productForm.patchValue({
      familyCode,
      productKind: kind,
      categoryName: catName,
      sectionCode: section,
      subcategoryPrefix: section
    }, { emitEvent: false });
    this.fillingForm = false;
  }

  getInactiveCount(): number {
    return this.products.filter(p => p.status === 'INACTIVO' || p.status === 'DESCONTINUADO').length;
  }

  createVariant(): void {
    if (!this.selectedProduct) return;
    this.showVariantForm = true;
    this.editingVariant = null;
    this.attrRows = [];
    this.variantBrand = '';
    this.quickStockVariantId = null;
    this.clearVariantTechSheet();
    const autoCode = this.generateVariantCode(this.selectedProduct);
    this.variantForm.reset({
      code: autoCode,
      sizeLabel: '',
      dimensions: '',
      salePrice: 0,
      minQty: 0,
      initialQty: null,
      initialUnitCost: 0,
      generalSpecs: ''
    });
  }

  editVariant(variant: InventoryVariant): void {
    this.showVariantForm = true;
    this.editingVariant = variant;
    this.quickStockVariantId = null;
    this.clearVariantTechSheet();
    this.variantTechSheetExisting = (variant as any).techSheetPdf || '';
    this.variantForm.patchValue({
      code: variant.code,
      sizeLabel: variant.sizeLabel || '',
      dimensions: variant.dimensions || '',
      salePrice: variant.salePrice || 0,
      minQty: variant.minQty || 0,
      initialQty: null,
      initialUnitCost: 0,
      generalSpecs: (variant as any).generalSpecs || ''
    });
    if (variant.id) {
      const existing = this.variantAttributes[variant.id] || [];
      const brandAttr = existing.find(a => (a.attributeName || '').toLowerCase() === 'marca');
      this.variantBrand = brandAttr?.attributeValue || '';
      this.attrRows = existing
        .filter(a => (a.attributeName || '').toLowerCase() !== 'marca')
        .map(a => ({ id: a.id, name: a.attributeName, value: a.attributeValue }));
    } else {
      this.variantBrand = '';
      this.attrRows = [];
    }
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return 'assets/img/company-placeholder.svg';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/api/files')) return imagePath;
    return `/api/files/${imagePath}`;
  }

  getSupplierName(supplierId?: number): string {
    if (!supplierId) return '-';
    const supplier = this.suppliers.find(s => s.id === supplierId);
    return supplier?.name || '-';
  }

  confirmDelete(product: InventoryProduct, event: Event): void {
    event.stopPropagation();
    
    const confirmMsg = `¿Estás seguro de eliminar el producto "${product.name}"?\n\nCódigo: ${product.code}\nEsta acción no se puede deshacer.`;
    
    if (confirm(confirmMsg)) {
      this.deleteProduct(product.id!);
    }
  }

  confirmDeactivate(product: InventoryProduct, event: Event): void {
    event.stopPropagation();
    const msg = `¿Deseas desactivar el producto "${product.name}"?\n\nCódigo: ${product.code}\n\nPodrás reactivarlo después desde Inactivos.`;
    if (!confirm(msg)) return;

    this.productService.getById(this.ruc, product.id!).subscribe({
      next: (prodFull) => {
        const payload: InventoryProduct = { ...prodFull, status: 'INACTIVO' };
        this.productService.update(this.ruc, product.id!, payload).subscribe({
          next: (saved) => {
            const idx = this.products.findIndex(p => p.id === product.id);
            if (idx >= 0) this.products[idx] = { ...this.products[idx], status: saved.status };
            this.filterStatus = 'INACTIVO';
            this.successMessage = 'Producto desactivado. Puedes reactivarlo con el botón ✓ de esta lista.';
          },
          error: (err) => {
            this.errorMessage = err?.error?.message || 'No se pudo desactivar el producto';
          }
        });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo leer el producto';
      }
    });
  }

  confirmActivate(product: InventoryProduct, event: Event): void {
    event.stopPropagation();
    const msg = `¿Deseas volver a activar el producto "${product.name}"?\n\nCódigo: ${product.code}`;
    if (!confirm(msg)) return;

    this.productService.getById(this.ruc, product.id!).subscribe({
      next: (prodFull) => {
        const payload: InventoryProduct = { ...prodFull, status: 'ACTIVO' };
        this.productService.update(this.ruc, product.id!, payload).subscribe({
          next: (saved) => {
            const idx = this.products.findIndex(p => p.id === product.id);
            if (idx >= 0) this.products[idx] = { ...this.products[idx], status: saved.status };
            this.filterStatus = 'ACTIVO';
            this.successMessage = 'Producto reactivado correctamente';
          },
          error: (err) => {
            this.errorMessage = err?.error?.message || 'No se pudo reactivar el producto';
          }
        });
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo leer el producto';
      }
    });
  }

  deleteProduct(productId: number): void {
    this.productService.delete(this.ruc, productId).subscribe({
      next: () => {
        // Con la nueva semántica del backend: si el producto estaba INACTIVO, ya está eliminado físicamente.
        // Remover de la lista local sin llamadas adicionales.
        this.products = this.products.filter(p => p.id !== productId);
        this.successMessage = 'Producto eliminado definitivamente';
        if (this.editingProductId === productId) this.cancelEdit();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo eliminar el producto. Verifique dependencias (variantes/movimientos).';
      }
    });
  }

  // ====== LÓGICA DE FORMULARIO (COLUMNA IZQUIERDA) ======
  initForm(): void {
    const firstFamily = this.companyFamilyOptions[0]?.code || 'EPP';
    const firstKind = this.companyFamilyOptions[0]?.productKind || 'EPP';
    const firstSec = this.subcategoryOptions[0]?.prefix || 'CAS';
    this.productForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(100)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      familyCode: [firstFamily, Validators.required],
      productKind: [firstKind, Validators.required],
      categoryName: ['EPP'],
      sectionCode: [firstSec, Validators.required],
      subcategoryPrefix: [firstSec],
      unitOfMeasure: ['UND'],
      status: ['ACTIVO', Validators.required],
      description: ['']
    });
    this.productForm.get('familyCode')?.valueChanges.subscribe((code: string) => {
      if (this.fillingForm) return;
      const kind = this.productKindForFamily(code);
      this.productForm.patchValue({ productKind: kind }, { emitEvent: false });
      this.onProductKindChange();
    });
    this.productForm.get('productKind')?.valueChanges.subscribe(() => {
      if (this.fillingForm) return;
      this.onProductKindChange();
    });
    this.productForm.get('sectionCode')?.valueChanges.subscribe((code: string) => {
      if (this.fillingForm) return;
      this.productForm.patchValue({ subcategoryPrefix: code }, { emitEvent: false });
      this.syncNameFromSectionIfNeeded();
      if (!this.editingProductId) {
        this.suggestCode(false);
      }
    });
    this.productForm.get('name')?.valueChanges.subscribe((name: string) => {
      if (this.fillingForm) return;
      const suggested = this.suggestedConcreteName();
      const n = (name || '').toString().trim();
      this.nameAutoFromSection = !n || n === suggested || this.isGenericProductName(n);
    });
  }

  // ====== VARIANTES (FORM EN MODAL) ======
  initVariantForm(): void {
    this.variantForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(100)]],
      sizeLabel: [''],
      dimensions: [''],
      salePrice: [0],
      minQty: [0],
      /** Solo al crear: ingreso inicial a bodega (genera entrada confirmada). */
      initialQty: [null as number | null],
      initialUnitCost: [0],
      generalSpecs: ['', [Validators.maxLength(500)]]
    });
  }

  openVariants(product: InventoryProduct, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectProduct(product);
  }

  cancelVariantEdit(): void {
    this.showVariantForm = false;
    this.editingVariant = null;
    this.attrRows = [];
    this.variantBrand = '';
    this.clearVariantTechSheet();
    if (this.variantForm) {
      this.variantForm.reset({
        code: '',
        sizeLabel: '',
        dimensions: '',
        salePrice: 0,
        minQty: 0,
        initialQty: null,
        initialUnitCost: 0,
        generalSpecs: ''
      });
    }
  }

  clearVariantTechSheet(): void {
    this.variantTechSheetFile = null;
    this.variantTechSheetName = '';
    this.variantTechSheetExisting = '';
    this.variantTechSheetBusy = false;
  }

  onVariantTechSheetSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] || null;
    if (!file) return;
    const name = (file.name || '').toLowerCase();
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
    if (!isPdf) {
      this.errorMessage = 'La ficha técnica debe ser un archivo PDF.';
      input.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage = 'El PDF no debe superar 10 MB.';
      input.value = '';
      return;
    }
    this.variantTechSheetFile = file;
    this.variantTechSheetName = file.name;
    this.errorMessage = '';
  }

  removeVariantTechSheet(): void {
    this.variantTechSheetFile = null;
    this.variantTechSheetName = '';
    this.variantTechSheetExisting = '';
  }

  specsCharCount(): number {
    return String(this.variantForm?.get('generalSpecs')?.value || '').length;
  }

  getTechSheetUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('/api/')) return path;
    const clean = path.replace(/^\/+/, '');
    if (clean.includes('/')) {
      const parts = clean.split('/');
      const file = parts.pop() || '';
      const dir = parts.join('/');
      return this.fileService.getFileDirectoryUrl(dir, file, false);
    }
    return this.fileService.getFileUrl(clean);
  }

  private buildEntryNumber(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `ING-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  /** Ingreso a bodega (entrada confirmada) sin salir del catálogo. */
  receiveStockForVariant(
    variantId: number,
    quantity: number,
    unitCost: number = 0,
    onDone?: (ok: boolean) => void,
    lot?: {
      lotNumber?: string;
      manufacturingDate?: string;
      expirationDate?: string;
      warehouseLocation?: string;
    }
  ): void {
    if (!this.canWrite) {
      this.errorMessage = 'Modo solo consulta: no puedes registrar ingresos.';
      onDone?.(false);
      return;
    }
    const qty = Number(quantity);
    if (!variantId || !(qty > 0)) {
      this.errorMessage = 'Indica una cantidad mayor a 0 para el ingreso.';
      onDone?.(false);
      return;
    }
    const user = this.auth.getCurrentUser();
    const receivedBy = (user?.name || user?.username || 'Sistema') as string;
    const cost = Number(unitCost || 0);
    const lotNumber = (lot?.lotNumber || '').trim();
    const entry: InventoryEntry = {
      entryNumber: this.buildEntryNumber(),
      entryDate: new Date().toISOString().slice(0, 10),
      entryType: 'COMPRA',
      receivedBy,
      authorizedBy: receivedBy,
      notes: `Ingreso de compra (rápido desde catálogo) · ${this.selectedProduct?.name || ''}`,
      status: 'BORRADOR',
      details: [{
        variantId,
        quantity: qty,
        unitCost: cost,
        taxPercentage: 0,
        taxAmount: 0,
        totalCost: cost * qty,
        itemCondition: 'NUEVO',
        lotNumber: lotNumber || undefined,
        manufacturingDate: lot?.manufacturingDate || undefined,
        expirationDate: lot?.expirationDate || undefined,
        warehouseLocation: (lot?.warehouseLocation || '').trim() || undefined
      }]
    };
    this.quickStockBusy = true;
    this.entryService.create(this.ruc, entry).subscribe({
      next: (created) => {
        const id = Number(created?.id);
        if (!id) {
          this.quickStockBusy = false;
          this.successMessage = 'Ingreso registrado';
          onDone?.(true);
          return;
        }
        this.entryService.confirm(this.ruc, id).subscribe({
          next: () => {
            this.quickStockBusy = false;
            this.successMessage = lotNumber
              ? `+${qty} und. en bodega · lote ${lotNumber}. Stock actualizado.`
              : `+${qty} und. ingresadas a bodega. Stock actualizado en esa talla/color.`;
            if (this.selectedProduct?.id) this.loadVariants(this.selectedProduct.id);
            this.refreshCategoryTotalForSelectedProduct();
            onDone?.(true);
          },
          error: (err) => {
            this.quickStockBusy = false;
            this.errorMessage = err?.error?.message || 'Entrada creada pero no se pudo confirmar (stock no actualizado)';
            onDone?.(false);
          }
        });
      },
      error: (err) => {
        this.quickStockBusy = false;
        this.errorMessage = err?.error?.message || 'No se pudo registrar el ingreso';
        onDone?.(false);
      }
    });
  }

  openQuickStock(variant: InventoryVariant): void {
    if (!variant?.id) return;
    this.quickStockVariantId = variant.id;
    this.quickStockQty = null;
    this.quickStockUnitCost = 0;
    this.quickStockLotNumber = '';
    this.quickStockManufacturingDate = '';
    this.quickStockExpirationDate = '';
    this.quickStockLocation = '';
    this.showVariantForm = false;
  }

  quickStockVariant(): InventoryVariant | null {
    if (!this.quickStockVariantId) return null;
    return this.productVariants.find(v => v.id === this.quickStockVariantId) || null;
  }

  totalVariantStock(): number {
    return (this.productVariants || []).reduce((acc, v) => acc + this.toNum((v as any).currentQty), 0);
  }

  cancelQuickStock(): void {
    this.quickStockVariantId = null;
    this.quickStockQty = null;
    this.quickStockUnitCost = 0;
    this.quickStockLotNumber = '';
    this.quickStockManufacturingDate = '';
    this.quickStockExpirationDate = '';
    this.quickStockLocation = '';
  }

  submitQuickStock(): void {
    if (!this.quickStockVariantId) return;
    this.receiveStockForVariant(
      this.quickStockVariantId,
      Number(this.quickStockQty || 0),
      Number(this.quickStockUnitCost || 0),
      (ok) => { if (ok) this.cancelQuickStock(); },
      {
        lotNumber: this.quickStockLotNumber,
        manufacturingDate: this.quickStockManufacturingDate,
        expirationDate: this.quickStockExpirationDate,
        warehouseLocation: this.quickStockLocation
      }
    );
  }

  submitVariant(): void {
    if (!this.selectedProduct?.id) return;
    if (this.variantForm.invalid) { this.errorMessage = 'Completa correctamente el formulario de variante'; return; }

    const raw = this.variantForm.value as any;
    const initialQty = Number(raw.initialQty || 0);
    const initialUnitCost = Number(raw.initialUnitCost || 0);
    const specs = String(raw.generalSpecs || '').trim();
    if (specs.length > 500) {
      this.errorMessage = 'Las especificaciones generales no pueden superar 500 caracteres.';
      return;
    }

    const buildPayload = (techSheetPdf?: string | null) => {
      const payload: any = {
        productId: this.selectedProduct!.id,
        code: raw.code,
        sizeLabel: raw.sizeLabel || undefined,
        dimensions: raw.dimensions || undefined,
        salePrice: raw.salePrice || 0,
        minQty: raw.minQty || 0,
        generalSpecs: specs || null
      };
      if (techSheetPdf !== undefined) {
        payload.techSheetPdf = techSheetPdf;
      } else if (this.variantTechSheetExisting) {
        payload.techSheetPdf = this.variantTechSheetExisting;
      } else if (this.editingVariant) {
        // Si el usuario quitó el PDF existente
        payload.techSheetPdf = '';
      }
      return payload;
    };

    const saveAttributes = (variantId: number) => {
      const brand = (this.variantBrand || '').trim();
      const rows = [
        ...(brand ? [{ id: undefined as number | undefined, name: 'Marca', value: brand }] : []),
        ...this.attrRows.filter(a => a.name.trim() && a.value.trim() && a.name.trim().toLowerCase() !== 'marca')
      ];
      if (brand && this.editingVariant?.id) {
        const prev = (this.variantAttributes[this.editingVariant.id] || [])
          .find(a => (a.attributeName || '').toLowerCase() === 'marca');
        if (prev?.id && rows[0]) rows[0].id = prev.id;
      }
      if (!rows.length) return;
      const calls = rows.map(a =>
        a.id
          ? this.attrService.update(this.ruc, variantId, a.id, { attributeName: a.name, attributeValue: a.value })
          : this.attrService.create(this.ruc, variantId, { attributeName: a.name, attributeValue: a.value })
      );
      forkJoin(calls).subscribe({
        next: () => {
          if (this.selectedProduct?.id) this.loadVariants(this.selectedProduct.id);
        },
        error: () => {}
      });
    };

    const persist = (techSheetPdf?: string | null) => {
      const payload = buildPayload(techSheetPdf);
      if (this.editingVariant?.id) {
        this.variantService.update(this.ruc, this.editingVariant.id!, payload).subscribe({
          next: (updated) => {
            saveAttributes(updated.id!);
            this.successMessage = 'Variante actualizada correctamente';
            this.loadVariants(this.selectedProduct!.id!);
            this.refreshCategoryTotalForSelectedProduct();
            this.cancelVariantEdit();
          },
          error: (err) => this.errorMessage = err?.error?.message || 'Error al actualizar la variante'
        });
      } else {
        this.variantService.create(this.ruc, payload).subscribe({
          next: (created) => {
            saveAttributes(created.id!);
            const finish = () => {
              this.loadVariants(this.selectedProduct!.id!);
              this.refreshCategoryTotalForSelectedProduct();
              this.cancelVariantEdit();
            };
            if (created.id && initialQty > 0) {
              this.receiveStockForVariant(created.id, initialQty, initialUnitCost, () => {
                this.successMessage = `Variante creada · +${initialQty} und. en bodega (stock de esa talla/color)`;
                finish();
              });
            } else {
              this.successMessage = 'Variante creada correctamente';
              finish();
            }
          },
          error: (err) => this.errorMessage = err?.error?.message || 'Error al crear la variante'
        });
      }
    };

    if (this.variantTechSheetFile) {
      this.variantTechSheetBusy = true;
      this.fileService.uploadFileToDirectory('inventory_variants', this.variantTechSheetFile).subscribe({
        next: (resp) => {
          this.variantTechSheetBusy = false;
          persist(resp?.url || null);
        },
        error: (err) => {
          this.variantTechSheetBusy = false;
          this.errorMessage = err?.message || 'No se pudo subir la ficha técnica PDF';
        }
      });
      return;
    }

    persist();
  }

  private refreshCategoryTotalForSelectedProduct(): void {
    if (!this.selectedProduct) return;
    const name = this.getProductCategory(this.selectedProduct);
    if (!name) return;
    delete this.categoryStockTotals[name];
    this.loadingCategoryTotals.delete(name);
    this.computeCategoryTotal(name);
  }

  loadSuppliers(): void {
    forkJoin([
      this.supplierService.listGlobal().pipe(catchError(() => of([] as any[]))),
      this.supplierService.listCatalog().pipe(catchError(() => of([] as any[]))),
      this.supplierService.list(this.ruc).pipe(catchError(() => of([] as any[])))
    ]).subscribe(([global, catalog, byRuc]) => {
      const map = new Map<string, InventorySupplier & { name: string }>();
      [...(global||[]), ...(catalog||[]), ...(byRuc||[])].forEach((s: any) => {
        const name = (s?.name || '').toString().trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!map.has(key)) map.set(key, { ...s, name });
      });
      this.suppliers = Array.from(map.values()).sort((a, b) => (a.name||'').localeCompare(b.name||''));
    }, () => this.suppliers = []);
  }

  loadCategories(after?: () => void): void {
    forkJoin([
      this.categoryService.listGlobal().pipe(catchError(() => of([] as any[]))),
      this.categoryService.listCatalog().pipe(catchError(() => of([] as any[]))),
      this.categoryService.list(this.ruc).pipe(catchError(() => of([] as any[])))
    ]).subscribe(([global, catalog, byRuc]) => {
      const set = new Map<string, InventoryCategory & { name: string }>();

      // Global/catalog categories: solo nombre, sin ID (el ID es de otra tabla)
      [...(global||[]), ...(catalog||[])].forEach((c: any) => {
        const name = (c?.name || '').toString().trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!set.has(key)) set.set(key, { name, id: undefined as any });
      });

      // Categorías de la empresa: tienen ID válido para categoryRef → siempre sobreescriben
      [...(byRuc||[])].forEach((c: any) => {
        const name = (c?.name || '').toString().trim();
        if (!name) return;
        const key = name.toLowerCase();
        set.set(key, { ...c, name });
      });

      this.categories = Array.from(set.values()).sort((a, b) => (a.name||'').localeCompare(b.name||''));

      // Si estamos editando, conservar/inyectar la categoría guardada (no pisar con default).
      try {
        const current = (this.productForm?.value?.categoryName || '').toString().trim();
        if (this.editingProductId && current) {
          this.ensureCategoryOption(current);
          this.productForm.patchValue({ categoryName: current }, { emitEvent: false });
        } else if (!this.editingProductId) {
          const hasCurrent = current && this.categories.some(c => (c.name||'').toLowerCase() === current.toLowerCase());
          if (!hasCurrent) {
            const kind = (this.productForm?.value?.productKind || 'EPP') as 'EPP' | 'HERRAMIENTA' | 'PIEZA';
            const def = this.resolveCategoryNameForKind(kind);
            if (def) this.productForm.patchValue({ categoryName: def }, { emitEvent: false });
          }
        }
      } catch {}
      if (after) after();
    }, () => {
      this.categories = [];
      if (after) after();
    });
  }

  getCategoryName(categoryId: number | null): string {
    if (!categoryId) return '';
    const cat = this.categories.find(c => c.id === categoryId);
    return cat?.name || '';
  }

  /** Obtiene el categoryRef (id de InventoryCategory) por nombre, solo si existe en categorías de empresa */
  getCategoryRefByName(name: string): { id: number } | null {
    if (!name) return null;
    const cat = this.categories.find(c => c.name?.toLowerCase() === name.toLowerCase() && c.id);
    return cat?.id ? { id: cat.id } : null;
  }

  fillForm(p: InventoryProduct): void {
    this.editingProductId = p.id || null;
    this.fillingForm = true;
    // Priorizar el texto `category` (lo que el usuario guardó en el select).
    // Si solo viene FK, usar categoryRef.name.
    let catName = '';
    if (p.category && String(p.category).trim()) {
      catName = String(p.category).trim();
    } else if (p.categoryRef?.name) {
      catName = p.categoryRef.name;
    } else if ((p as any).categoryRef?.id) {
      const found = this.categories.find(c => c.id === (p as any).categoryRef.id);
      catName = found?.name || '';
    }
    const kind = this.getProductKind(p);
    const familyCode = this.getProductFamilyCode(p);
    if (!catName) catName = this.resolveCategoryNameForKind(kind);
    this.ensureCategoryOption(catName);
    this.subcategoryOptions = this.companySectionsFlat.length
      ? [...this.companySectionsFlat]
      : [...INVENTORY_SECTIONS_BY_KIND.EPP];
    const sectionCode = (p.sectionCode || this.extractSubPrefixFromCode(p.code || '') || this.subcategoryOptions[0]?.prefix || 'OTR').toString().toUpperCase();
    const sectionOk = this.subcategoryOptions.some(s => s.prefix === sectionCode)
      ? sectionCode
      : (this.subcategoryOptions[0]?.prefix || 'OTR');
    this.productForm.reset({
      code: p.code,
      name: p.name,
      familyCode,
      productKind: kind,
      categoryName: catName,
      sectionCode: sectionOk,
      subcategoryPrefix: sectionOk,
      unitOfMeasure: 'UND',
      status: p.status || 'ACTIVO',
      description: p.description || ''
    }, { emitEvent: false });
    // Mostrar imagen actual si existe
    if (p.image) {
      this.imagePreviewUrl = this.getImageUrl(p.image);
    } else {
      this.imagePreviewUrl = null;
    }
    this.selectedImageFile = null;
    this.successMessage = '';
    this.errorMessage = '';
    this.formPanelError = '';
    // Cerrar el modal de detalles si estaba abierto
    this.selectedProduct = null;
    this.fillingForm = false;
    if (this.isGenericProductName(p.name || '')) {
      this.nameAutoFromSection = true;
      this.applySuggestedProductName();
      this.formPanelError = 'El nombre era genérico: se completó con la sección. Puedes afinar marca/modelo si quieres y guardar.';
    } else {
      this.nameAutoFromSection = false;
      this.formPanelError = '';
    }
  }

  cancelEdit(): void {
    this.editingProductId = null;
    this.showProductForm = false;
    const family = this.companyFamilyOptions[0];
    const familyCode = family?.code || 'EPP';
    const kind = family?.productKind || 'EPP';
    this.subcategoryOptions = this.companySectionsFlat.length
      ? [...this.companySectionsFlat]
      : [...INVENTORY_SECTIONS_BY_KIND.EPP];
    const section = this.subcategoryOptions[0]?.prefix || 'OTR';
    this.productForm.reset({
      code: '',
      name: '',
      familyCode,
      productKind: kind,
      categoryName: this.resolveCategoryNameForKind(kind),
      sectionCode: section,
      subcategoryPrefix: section,
      unitOfMeasure: 'UND',
      status: 'ACTIVO',
      description: ''
    });
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
    this.formPanelError = '';
  }

  private setDefaultPanelPosition(): void {
    try {
      const width = 720; // panel más amplio para reducir scroll
      const x = Math.max(16, Math.round((window.innerWidth - width) / 2));
      const y = 48;
      this.panelPos = { x, y };
    } catch {
      this.panelPos = { x: 24, y: 64 };
    }
  }

  onPanelHeaderMouseDown(event: MouseEvent): void {
    this.dragging = true;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.panelStart = { ...this.panelPos };
    event.preventDefault();
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    if (!this.dragging) return;
    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;
    const width = 720;
    const margin = 8;
    const maxX = Math.max(margin, (typeof window !== 'undefined' ? window.innerWidth : 1200) - width - margin);
    const maxY = Math.max(margin, (typeof window !== 'undefined' ? window.innerHeight : 800) - 120 - margin);
    let x = this.panelStart.x + dx;
    let y = this.panelStart.y + dy;
    x = Math.min(Math.max(margin, x), maxX);
    y = Math.max(margin, y);
    this.panelPos = { x, y };
  }

  @HostListener('window:mouseup')
  onWindowMouseUp(): void {
    this.dragging = false;
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    // Si el usuario regresó desde las pantallas de configuración, refrescar listas
    this.loadSuppliers();
    this.loadCategories();
  }

  onImageSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Solo se permiten archivos de imagen';
        event.target.value = '';
        return;
      }
      // Validar tamaño (5 MB máx)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'La imagen no debe superar los 5 MB';
        event.target.value = '';
        return;
      }
      this.selectedImageFile = file;
      // Mostrar preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
      this.errorMessage = '';
    }
  }

  submitProduct(): void {
    if (!this.canWrite) {
      this.formPanelError = this.errorMessage = 'Modo solo consulta: no puedes guardar cambios.';
      return;
    }
    if (this.productForm.invalid) {
      this.formPanelError = this.errorMessage = 'Completa correctamente el formulario del producto';
      this.productForm.markAllAsTouched();
      return;
    }
    this.errorMessage = '';
    this.formPanelError = '';
    const raw = this.productForm.value;
    if (this.isGenericProductName(raw.name)) {
      const msg = `No se puede guardar con el nombre “${(raw.name || '').toString().trim()}”. Cámbialo a un producto concreto (ej: ${this.suggestedConcreteName()}).`;
      this.formPanelError = this.errorMessage = msg;
      return;
    }

    let code = this.normalizeCode(raw.code);
    if (!code) {
      code = this.buildNextConsecutiveCode();
      this.productForm.patchValue({ code }, { emitEvent: false });
    }
    if (this.isCodeTaken(code)) {
      const next = this.buildNextConsecutiveCode();
      this.productForm.patchValue({ code: next }, { emitEvent: false });
      this.notifyDuplicate(
        `El código “${code}” ya existe. Se asignó el siguiente consecutivo: ${next}. Revisa y guarda de nuevo.`
      );
      return;
    }

    const name = (raw.name || '').toString().trim();
    if (this.isNameTaken(name)) {
      this.notifyDuplicate(
        `El nombre “${name}” ya existe en el catálogo. Debe ser único; cámbialo para continuar.`
      );
      return;
    }

    const sectionCode = (raw.sectionCode || raw.subcategoryPrefix || '').toString().toUpperCase();
    if (!sectionCode) {
      this.formPanelError = this.errorMessage = 'Selecciona la sección (Casco, Pantalón, etc.).';
      return;
    }
    const sectionLabel = this.sectionLabelForPrefix(sectionCode);
    const familyCode = this.familySkuCode(raw.familyCode);
    const kind = this.productKindForFamily(familyCode);
    const categoryName: string = (raw.categoryName || this.resolveCategoryNameForKind(kind) || '').trim();
    this.ensureCategoryOption(categoryName);
    const categoryRef = this.getCategoryRefByName(categoryName);
    const payload: InventoryProduct = {
      code,
      name,
      productKind: kind,
      sectionCode,
      sectionLabel,
      category: categoryName,
      categoryRef,
      unitOfMeasure: 'UND',
      status: raw.status,
      description: raw.description || undefined
    };

    if (this.editingProductId) {
      const existing = this.products.find(p => p.id === this.editingProductId) || {} as InventoryProduct;
      const payloadFull: InventoryProduct = {
        code,
        name,
        productKind: kind,
        sectionCode,
        sectionLabel,
        category: categoryName,
        categoryRef: categoryRef,
        unitOfMeasure: 'UND',
        status: raw.status,
        description: raw.description || existing.description,
        image: (existing as InventoryProduct).image
      };
      this.productService.update(this.ruc, this.editingProductId, payloadFull).subscribe({
        next: (updated) => {
          if (this.selectedImageFile) {
            this.uploadProductImage(updated.id!);
          } else {
            const idx = this.products.findIndex(p => p.id === this.editingProductId);
            if (idx >= 0) {
              this.products[idx] = {
                ...this.products[idx],
                ...updated,
                sectionCode,
                sectionLabel,
                category: updated.category || categoryName,
                image: this.products[idx].image
              };
            }
            this.successMessage = 'Producto actualizado correctamente';
            this.cancelEdit();
          }
        },
        error: (err) => {
          const msg = err?.error?.message || 'Error al actualizar el producto';
          this.formPanelError = this.errorMessage = msg;
        }
      });
    } else {
      this.productService.create(this.ruc, payload).subscribe({
        next: (created) => {
          if (this.selectedImageFile) {
            this.uploadProductImage(created.id!);
          } else {
            this.products.unshift(created);
            this.successMessage = 'Producto creado correctamente';
            this.cancelEdit();
          }
        },
        error: (err) => {
          const msg = err?.error?.message || 'Error al crear el producto';
          this.formPanelError = this.errorMessage = msg;
          // Si el backend reporta código duplicado, ofrecer el siguiente consecutivo.
          if (/código/i.test(msg) && /único|existe/i.test(msg)) {
            const next = this.buildNextConsecutiveCode();
            this.productForm.patchValue({ code: next }, { emitEvent: false });
            this.notifyDuplicate(`${msg} Se propone: ${next}`);
          }
        }
      });
    }
  }

  uploadProductImage(productId: number): void {
    if (!this.selectedImageFile) return;
    
    this.fileService.uploadFileToDirectory('inventory_products', this.selectedImageFile).subscribe({
      next: (response) => {
        // Obtener el producto completo y enviar un PUT con el payload completo + imagen
        this.productService.getById(this.ruc, productId).subscribe({
          next: (productFull) => {
            const payloadWithImage: InventoryProduct = { ...productFull, image: response.url };
            this.productService.update(this.ruc, productId, payloadWithImage).subscribe({
              next: (saved) => {
                const idx = this.products.findIndex(p => p.id === productId);
                if (idx >= 0) {
                  this.products[idx] = { ...saved };
                } else {
                  this.products.unshift(saved);
                }
                this.successMessage = this.editingProductId ? 'Producto actualizado correctamente' : 'Producto creado correctamente';
                this.cancelEdit();
              },
              error: () => {
                // Fallback local (no ideal, pero evita perder preview)
                const idx = this.products.findIndex(p => p.id === productId);
                if (idx >= 0) this.products[idx] = { ...this.products[idx], image: response.url };
                this.errorMessage = 'Imagen subida, pero no se pudo guardar en el producto';
                this.cancelEdit();
              }
            });
          },
          error: () => {
            // Si no se pudo obtener el producto, no enviamos PUT parcial para evitar borrar campos
            this.errorMessage = 'No se pudo leer el producto para asociar la imagen. Intenta de nuevo.';
            this.cancelEdit();
          }
        });
      },
      error: () => {
        this.errorMessage = 'Error al subir la imagen. El producto se guardó sin imagen.';
        this.cancelEdit();
      }
    });
  }
}
