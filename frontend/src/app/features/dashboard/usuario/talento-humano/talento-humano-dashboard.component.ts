import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { BusinessContextService } from '../../../../core/services/business-context.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-talento-humano-dashboard',
  templateUrl: './talento-humano-dashboard.component.html',
  styleUrls: ['./talento-humano-dashboard.component.scss']
})
export class TalentoHumanoDashboardComponent implements OnInit {
  ruc: string | null = null;
  welcomeLink: any[] = ['/'];
  currentUserName: string | null = null;
  currentUserEmail: string | null = null;
  businessName: string | null = null;
  businessEmail: string | null = null;
  userPhotoUrl: string | null = null;
  initials: string | null = null;

  constructor(private route: ActivatedRoute, private authService: AuthService, private businessContext: BusinessContextService) {}

  ngOnInit(): void {
    let parent: ActivatedRoute | null = this.route;
    while (parent) {
      const found = parent.snapshot.paramMap.get('ruc');
      if (found) { this.ruc = found; break; }
      parent = parent.parent;
    }
    if (this.ruc) {
      this.welcomeLink = ['/usuario', this.ruc, 'welcome'];
    }

    const u = this.authService.getCurrentUser();
    if (u) {
      const name = (u.name || '').toString().trim();
      const username = (u.username || '').toString().trim();
      const email = (u.email || '').toString().trim();
      this.currentUserName = name || username || email || null;
      this.currentUserEmail = email || null;
      this.userPhotoUrl = this.buildUserPhotoUrl((u.profilePicture || u.photo || '').toString());
      this.initials = this.buildInitials(this.currentUserName);
    }

    // Empresa activa para cabecera (preferir contexto; si no, derivar del usuario por RUC)
    const ctx = this.businessContext.getActiveBusiness() as any;
    if (ctx) {
      this.businessName = (ctx.name || '').toString().trim() || null;
      this.businessEmail = (ctx.email || '').toString().trim() || null;
    }
    if (!this.businessName && u?.businesses && Array.isArray(u.businesses)) {
      const found = this.ruc ? u.businesses.find((b: any) => String(b?.ruc) === String(this.ruc)) : u.businesses[0];
      if (found) {
        this.businessName = (found.name || '').toString().trim() || null;
        this.businessEmail = (found.email || '').toString().trim() || null;
        if (!this.initials) this.initials = this.buildInitials(this.businessName);
      }
    }
  }

  private buildUserPhotoUrl(raw: string): string | null {
    try {
      let rel = (raw || '').trim().replace(/\\/g, '/');
      if (!rel) return null;
      if (/^https?:\/\//i.test(rel)) return rel;
      if (rel.startsWith('uploads/')) rel = rel.substring('uploads/'.length);
      if (!rel.includes('/')) rel = `profiles/${rel}`;
      return `${environment.apiUrl}/api/files/${rel}`;
    } catch {
      return null;
    }
  }

  private buildInitials(source?: string | null): string | null {
    const s = (source || '').trim();
    if (!s) return null;
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.charAt(0) || '';
    const b = parts.length > 1 ? parts[1].charAt(0) : '';
    const init = `${a}${b}`.toUpperCase();
    return init || null;
  }
}
