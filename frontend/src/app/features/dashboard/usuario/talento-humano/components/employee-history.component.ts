import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ThFilePreviewService } from '../services/th-file-preview.service';

export type HistorySection = 'document' | 'course' | 'card';

export interface EmployeeHistoryItem {
  id: number;
  section: HistorySection;
  sectionLabel: string;
  employeeId?: number;
  employeeCedula?: string;
  employeeName?: string;
  employeeCode?: string;
  typeName: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
  extra?: string;
  files: Array<{ id?: number; file: string; fileName?: string; file_name?: string; fileType?: string }>;
}

export interface EmployeeHistoryGroup {
  employeeId: number;
  employeeName: string;
  employeeCedula: string;
  items: EmployeeHistoryItem[];
}

@Component({
  selector: 'app-employee-history',
  templateUrl: './employee-history.component.html',
  styleUrls: ['./employee-history.component.scss']
})
export class EmployeeHistoryComponent implements OnInit, OnChanges, OnDestroy {
  @Input() businessRuc = '';

  loading = false;
  items: EmployeeHistoryItem[] = [];
  sectionFilter: '' | HistorySection = '';
  typeFilter = '';
  yearFilter = '';
  workerFilter = '';

  constructor(private http: HttpClient, private filePreview: ThFilePreviewService) {}

  ngOnDestroy(): void {
    this.filePreview.close();
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['businessRuc']) this.load();
  }

  load(): void {
    const ruc = (this.businessRuc || '').trim();
    if (!ruc) {
      this.items = [];
      return;
    }
    this.loading = true;
    this.http.get<EmployeeHistoryItem[]>(`/api/employee-history/by-ruc/${encodeURIComponent(ruc)}`).subscribe({
      next: (rows) => {
        this.items = rows || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading company history', err);
        this.items = [];
        this.loading = false;
      }
    });
  }

  filteredItems(): EmployeeHistoryItem[] {
    const q = this.normalize(this.workerFilter);
    return this.items.filter(it => {
      if (this.sectionFilter && it.section !== this.sectionFilter) return false;
      if (this.typeFilter && it.typeName !== this.typeFilter) return false;
      if (this.yearFilter) {
        const y = this.yearOf(it.expiryDate) || this.yearOf(it.issueDate);
        if (String(y) !== this.yearFilter) return false;
      }
      if (q) {
        const blob = this.normalize(`${it.employeeName || ''} ${it.employeeCedula || ''} ${it.employeeCode || ''}`);
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }

  groupedEmployees(): EmployeeHistoryGroup[] {
    const map = new Map<number, EmployeeHistoryGroup>();
    for (const it of this.filteredItems()) {
      const id = Number(it.employeeId || 0);
      let g = map.get(id);
      if (!g) {
        g = {
          employeeId: id,
          employeeName: it.employeeName || 'Trabajador',
          employeeCedula: it.employeeCedula || '',
          items: []
        };
        map.set(id, g);
      }
      g.items.push(it);
    }
    return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }

  typeOptions(): string[] {
    const names = new Set(this.items
      .filter(it => !this.sectionFilter || it.section === this.sectionFilter)
      .map(it => it.typeName)
      .filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  yearOptions(): string[] {
    const years = new Set<string>();
    this.items.forEach(it => {
      const y = this.yearOf(it.expiryDate) || this.yearOf(it.issueDate);
      if (y) years.add(String(y));
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }

  sectionBadgeClass(section: HistorySection): string {
    if (section === 'document') return 'is-doc';
    if (section === 'course') return 'is-course';
    return 'is-card';
  }

  fileLabel(f: { fileName?: string; file_name?: string }): string {
    return f.fileName || f.file_name || 'Ver PDF';
  }

  openFile(file: { file: string; fileName?: string; file_name?: string; fileType?: string }): void {
    this.filePreview.open({
      file: file.file,
      file_name: file.fileName || file.file_name,
      file_type: file.fileType
    });
  }

  private normalize(s: string): string {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private yearOf(dateStr?: string): number | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.getFullYear();
  }
}
