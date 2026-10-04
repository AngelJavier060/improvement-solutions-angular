import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService } from '../../services/file.service';
import { BirthdayPerson } from './birthday-greeting.service';

@Component({
  selector: 'app-birthday-greeting-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './birthday-greeting-card.component.html',
  styleUrls: ['./birthday-greeting-overlay.component.scss']
})
export class BirthdayGreetingCardComponent {
  @Input() person: BirthdayPerson | null = null;
  @Input() companyName = '';
  @Input() companyLogo: string | null = null;
  @Input() phrase = '';
  @Input() showPhoto = true;
  @Input() peopleCount = 1;
  @Input() index = 0;
  @Input() preview = false;
  @Input() emailTo: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();

  constructor(private files: FileService) {}

  photoUrl(path?: string | null): string {
    if (!this.showPhoto) return '';
    return this.resolveMedia(path || '', 'profiles');
  }

  logoUrl(): string {
    return this.resolveMedia(this.companyLogo || '', 'logos');
  }

  onImgError(ev: Event): void {
    const img = ev.target as HTMLImageElement | null;
    if (img) img.style.display = 'none';
  }

  private resolveMedia(raw: string, directory: string): string {
    const path = String(raw || '').replace(/\\/g, '/').trim();
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/api/files')) return path;
    const file = path.split('/').pop() || path;
    if (path.includes(directory + '/') || !path.includes('/')) {
      try {
        return this.files.getFileUrlFromDirectory(directory, file, true);
      } catch {
        return `/api/files/${directory}/${file}`;
      }
    }
    return `/api/files/${path.replace(/^\.?\/?/, '')}`;
  }
}
