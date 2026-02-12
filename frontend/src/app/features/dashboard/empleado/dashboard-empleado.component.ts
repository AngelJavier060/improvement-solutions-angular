import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeePanelService, EmployeeDashboard } from '../../../services/employee-panel.service';

@Component({
  selector: 'app-dashboard-empleado',
  templateUrl: './dashboard-empleado.component.html',
  styleUrls: ['./dashboard-empleado.component.scss']
})
export class DashboardEmpleadoComponent implements OnInit {

  dashboard: EmployeeDashboard | null = null;
  isLoading = true;
  error = '';
  activeTab: 'resumen' | 'documentos' | 'cursos' | 'perfil' = 'resumen';

  documents: any[] = [];
  courses: any[] = [];
  profile: any = null;

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

  setTab(tab: 'resumen' | 'documentos' | 'cursos' | 'perfil'): void {
    this.activeTab = tab;
    if (tab === 'documentos' && this.documents.length === 0) {
      this.loadDocuments();
    }
    if (tab === 'cursos' && this.courses.length === 0) {
      this.loadCourses();
    }
    if (tab === 'perfil' && !this.profile) {
      this.loadProfile();
    }
  }

  loadDocuments(): void {
    this.employeePanelService.getMyDocuments().subscribe({
      next: (data) => { this.documents = data; },
      error: () => { this.documents = []; }
    });
  }

  loadCourses(): void {
    this.employeePanelService.getMyCourses().subscribe({
      next: (data) => { this.courses = data; },
      error: () => { this.courses = []; }
    });
  }

  loadProfile(): void {
    this.employeePanelService.getMyProfile().subscribe({
      next: (data) => { this.profile = data; },
      error: () => { this.profile = null; }
    });
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
