import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import {
  EmployeePanelService,
  EmployeeDashboard,
  EmployeePanelDocument,
  EmployeePanelCourse,
  EmployeePanelCard,
  EmployeeProfile
} from '../../../services/employee-panel.service';

@Component({
  selector: 'app-dashboard-empleado',
  templateUrl: './dashboard-empleado.component.html',
  styleUrls: ['./dashboard-empleado.component.scss']
})
export class DashboardEmpleadoComponent implements OnInit {

  dashboard: EmployeeDashboard | null = null;
  isLoading = true;
  error = '';
  activeTab: 'resumen' | 'documentos' | 'cursos' | 'tarjetas' | 'perfil' = 'perfil';

  documents: EmployeePanelDocument[] = [];
  courses: EmployeePanelCourse[] = [];
  cards: EmployeePanelCard[] = [];
  profile: EmployeeProfile | null = null;
  openingFile = false;
  avatarUrl: string | null = null;

  constructor(
    private authService: AuthService,
    private employeePanelService: EmployeePanelService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.hasRole('ROLE_EMPLOYEE')) {
      this.router.navigate(['/']);
      return;
    }
    this.loadDashboard();
    this.loadProfile();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.employeePanelService.getMyDashboard().subscribe({
      next: (data) => {
        this.dashboard = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al cargar el panel de empleado';
        this.isLoading = false;
      }
    });
  }

  setTab(tab: 'resumen' | 'documentos' | 'cursos' | 'tarjetas' | 'perfil'): void {
    this.activeTab = tab;
    if (tab === 'documentos' && this.documents.length === 0) {
      this.loadDocuments();
    }
    if (tab === 'cursos' && this.courses.length === 0) {
      this.loadCourses();
    }
    if (tab === 'tarjetas' && this.cards.length === 0) {
      this.loadCards();
    }
    if (tab === 'perfil' && !this.profile) {
      this.loadProfile();
    }
  }

  loadDocuments(): void {
    this.employeePanelService.getMyDocuments().subscribe({
      next: (data) => { this.documents = data || []; },
      error: () => { this.documents = []; }
    });
  }

  loadCourses(): void {
    this.employeePanelService.getMyCourses().subscribe({
      next: (data) => { this.courses = data || []; },
      error: () => { this.courses = []; }
    });
  }

  loadCards(): void {
    this.employeePanelService.getMyCards().subscribe({
      next: (data) => { this.cards = data || []; },
      error: () => { this.cards = []; }
    });
  }

  loadProfile(): void {
    this.employeePanelService.getMyProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.avatarUrl = this.resolveImageUrl(data?.imagePath);
      },
      error: () => {
        this.profile = null;
        this.avatarUrl = null;
      }
    });
  }

  private resolveImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    const base = (environment.apiUrl || '').replace(/\/$/, '');
    if (/^https?:\/\//i.test(path)) return path;
    let rel = path.replace(/^\/+/, '');
    if (rel.startsWith('api/files/')) {
      return `${base}/${rel}`;
    }
    if (rel.startsWith('uploads/')) {
      rel = rel.substring('uploads/'.length);
    }
    if (!rel.startsWith('profiles/') && !rel.includes('/')) {
      rel = `profiles/${rel}`;
    }
    return `${base}/api/files/${rel}`;
  }

  openFile(file: { file?: string; file_name?: string } | null | undefined): void {
    const req = this.employeePanelService.downloadMyFile(file?.file);
    if (!req) return;
    this.openingFile = true;
    req.subscribe({
      next: (blob) => {
        this.openingFile = false;
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.openingFile = false;
        alert('No se pudo abrir el archivo.');
      }
    });
  }

  hasFiles(item: { files?: Array<{ file?: string }> } | null | undefined): boolean {
    return !!(item?.files && item.files.length > 0 && item.files.some(f => !!f?.file));
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  getDocStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'VIGENTE': return 'bg-success';
      case 'POR_VENCER': return 'bg-warning text-dark';
      case 'VENCIDO': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}
