import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { BirthdayGreetingCardComponent } from './birthday-greeting-card.component';
import {
  BirthdayGreetingService,
  BirthdayGreetingToday,
  BirthdayPerson
} from './birthday-greeting.service';

@Component({
  selector: 'app-birthday-greeting-overlay',
  standalone: true,
  imports: [CommonModule, BirthdayGreetingCardComponent],
  templateUrl: './birthday-greeting-overlay.component.html'
})
export class BirthdayGreetingOverlayComponent implements OnInit, OnDestroy {
  visible = false;
  loading = false;
  data: BirthdayGreetingToday | null = null;
  index = 0;
  phrase = '';

  private ruc = '';
  private slot = '';
  private navSub?: Subscription;

  constructor(
    private router: Router,
    private auth: AuthService,
    private birthday: BirthdayGreetingService
  ) {}

  ngOnInit(): void {
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.onRoute(this.router.url));
    this.onRoute(this.router.url);
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  get person(): BirthdayPerson | null {
    const people = this.data?.people || [];
    return people[this.index] || null;
  }

  get peopleCount(): number {
    return this.data?.people?.length || 0;
  }

  close(): void {
    if (this.ruc) this.birthday.markDismissed(this.ruc);
    this.visible = false;
  }

  next(): void {
    if (this.index < this.peopleCount - 1) {
      this.index += 1;
      this.phrase = this.resolvedPhrase();
      return;
    }
    this.close();
  }

  private currentSlot(): string {
    return new Date().getHours() < 15 ? 'am' : 'pm';
  }

  private onRoute(url: string): void {
    const path = (url || '').split('?')[0];
    const m = path.match(/^\/usuario\/([^/]+)/);
    if (!m || !this.auth.isLoggedIn()) {
      this.visible = false;
      this.ruc = '';
      this.slot = '';
      return;
    }
    const ruc = m[1];
    const slot = this.currentSlot();
    if (ruc === this.ruc && slot === this.slot) return;
    this.ruc = ruc;
    this.slot = slot;
    this.visible = false;
    this.tryShow(ruc);
  }

  private tryShow(ruc: string): void {
    if (this.birthday.wasDismissed(ruc)) {
      this.visible = false;
      return;
    }
    this.loading = true;
    this.birthday.today(ruc).subscribe({
      next: (res) => {
        this.loading = false;
        if (this.ruc !== ruc) return;
        const people = Array.isArray(res?.people) ? res.people : [];
        if (!res?.enabled || !people.length) {
          this.visible = false;
          this.data = null;
          return;
        }
        this.data = { ...res, people };
        this.index = 0;
        this.phrase = this.resolvedPhrase();
        this.visible = true;
      },
      error: () => {
        this.loading = false;
        this.visible = false;
      }
    });
  }

  private resolvedPhrase(): string {
    const name = this.data?.companyName || 'la empresa';
    const custom = (this.data?.message || '').trim();
    if (!custom) {
      return 'De parte de todo el equipo de ' + name
        + ', te deseamos un día lleno de alegría y muchos éxitos. '
        + 'Que este nuevo año de vida venga acompañado de grandes momentos y nuevas oportunidades.\n\n'
        + '¡Muchas felicidades!';
    }
    return custom
      .replace(/\[Nombre de la empresa\]/gi, name)
      .replace(/\[empresa\]/gi, name);
  }
}
