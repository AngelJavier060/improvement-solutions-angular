import {
  ChangeDetectorRef, Component, ElementRef, EventEmitter, forwardRef, Input,
  OnDestroy, OnInit, Output, ViewEncapsulation
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { formatDateDmy, maskDateDmy, pad2, parseDateDmy } from '../utils/date-dmy';

type DateCell = { day: number | null; iso: string | null };

@Component({
  selector: 'th-date-field',
  templateUrl: './th-date-field.component.html',
  styleUrls: ['./th-date-field.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ThDateFieldComponent),
    multi: true
  }]
})
export class ThDateFieldComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() placeholder = 'dd/mm/aaaa';
  @Input() align: 'start' | 'end' = 'start';
  @Output() dateChange = new EventEmitter<string>();

  display = '';
  iso = '';
  disabled = false;
  open = false;
  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth();
  cells: DateCell[] = [];
  readonly weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private outsideListener: ((ev: MouseEvent) => void) | null = null;

  constructor(
    private host: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {
    this.rebuildCells();
  }

  ngOnInit(): void {
    this.outsideListener = (ev: MouseEvent) => this.onOutsidePointer(ev);
    document.addEventListener('mousedown', this.outsideListener, true);
  }

  ngOnDestroy(): void {
    if (this.outsideListener) {
      document.removeEventListener('mousedown', this.outsideListener, true);
      this.outsideListener = null;
    }
  }

  writeValue(value: string | null): void {
    this.iso = value ? String(value).split(/[T\s]/)[0] : '';
    this.display = formatDateDmy(this.iso);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  get monthLabel(): string {
    const label = new Date(this.viewYear, this.viewMonth, 1)
      .toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  trackCell(index: number, cell: DateCell): string {
    return cell.iso || `empty-${index}`;
  }

  onType(raw: string): void {
    this.display = maskDateDmy(raw);
    const parsed = this.display.length === 10 ? parseDateDmy(this.display) : null;
    this.iso = parsed || '';
    this.emit(this.iso);
  }

  onBlur(): void {
    this.onTouched();
    if (!this.display) {
      this.iso = '';
      this.emit('');
      return;
    }
    const parsed = parseDateDmy(this.display);
    if (parsed) {
      this.iso = parsed;
      this.display = formatDateDmy(parsed);
      this.emit(parsed);
      this.cdr.detectChanges();
    }
  }

  toggleCal(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.disabled) return;
    this.open = !this.open;
    if (this.open) {
      const base = this.parseIsoLocal(this.iso) || new Date();
      this.viewYear = base.getFullYear();
      this.viewMonth = base.getMonth();
      this.rebuildCells();
    }
    this.cdr.detectChanges();
  }

  prevMonth(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear -= 1;
    } else {
      this.viewMonth -= 1;
    }
    this.rebuildCells();
    this.cdr.detectChanges();
  }

  nextMonth(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear += 1;
    } else {
      this.viewMonth += 1;
    }
    this.rebuildCells();
    this.cdr.detectChanges();
  }

  pickDay(iso: string | null, ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (!iso || this.disabled) return;
    this.iso = iso;
    this.display = formatDateDmy(iso);
    this.open = false;
    this.emit(iso);
    this.onTouched();
    this.cdr.detectChanges();
  }

  isSelected(iso: string | null): boolean {
    return !!iso && iso === this.iso;
  }

  isToday(iso: string | null): boolean {
    if (!iso) return false;
    const t = new Date();
    return iso === `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
  }

  private onOutsidePointer(ev: MouseEvent): void {
    if (!this.open) return;
    const target = ev.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) return;
    this.open = false;
    this.onTouched();
    this.cdr.detectChanges();
  }

  private emit(value: string): void {
    this.onChange(value);
    this.dateChange.emit(value);
  }

  private rebuildCells(): void {
    const first = new Date(this.viewYear, this.viewMonth, 1);
    const pad = (first.getDay() + 6) % 7;
    const lastDay = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();
    const out: DateCell[] = [];
    for (let i = 0; i < pad; i++) out.push({ day: null, iso: null });
    for (let d = 1; d <= lastDay; d++) {
      out.push({
        day: d,
        iso: `${this.viewYear}-${pad2(this.viewMonth + 1)}-${pad2(d)}`
      });
    }
    this.cells = out;
  }

  private parseIsoLocal(iso: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }
}
