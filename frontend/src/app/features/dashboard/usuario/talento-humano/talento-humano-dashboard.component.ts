import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-talento-humano-dashboard',
  templateUrl: './talento-humano-dashboard.component.html',
  styleUrls: ['./talento-humano-dashboard.component.scss']
})
export class TalentoHumanoDashboardComponent implements OnInit {
  ruc: string | null = null;
  welcomeLink: any[] = ['/'];

  constructor(private route: ActivatedRoute) {}

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
  }
}
