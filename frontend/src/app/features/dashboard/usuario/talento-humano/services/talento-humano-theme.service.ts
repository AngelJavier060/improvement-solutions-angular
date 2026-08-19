import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThTheme = 'light' | 'dark';

const STORAGE_KEY = 'talentoHumano_theme';

@Injectable({ providedIn: 'root' })
export class TalentoHumanoThemeService {
  private readonly themeSubject = new BehaviorSubject<ThTheme>(this.readStoredTheme());
  readonly theme$ = this.themeSubject.asObservable();

  get current(): ThTheme {
    return this.themeSubject.value;
  }

  get isDark(): boolean {
    return this.current === 'dark';
  }

  toggle(): void {
    this.set(this.isDark ? 'light' : 'dark');
  }

  set(theme: ThTheme): void {
    if (theme !== 'light' && theme !== 'dark') return;
    this.themeSubject.next(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch { /* storage no disponible */ }
  }

  private readStoredTheme(): ThTheme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch { /* ignore */ }
    return 'light';
  }
}
