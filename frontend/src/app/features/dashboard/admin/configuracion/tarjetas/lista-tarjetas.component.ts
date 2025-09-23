import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CardService, CardCatalog } from '../../../../../services/card.service';

@Component({
  selector: 'app-lista-tarjetas',
  templateUrl: './lista-tarjetas.component.html',
  styleUrls: ['./lista-tarjetas.component.scss']
})
export class ListaTarjetasComponent implements OnInit {
  items: CardCatalog[] = [];
  loading = false;
  error: string | null = null;

  constructor(private service: CardService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.service.getAll().subscribe({
      next: (data) => { this.items = data || []; this.loading = false; },
      error: (err) => { this.error = 'No se pudieron cargar las tarjetas.'; this.loading = false; console.error(err); }
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar esta tarjeta?')) return;
    this.service.delete(id).subscribe({
      next: () => this.load(),
      error: (err) => { console.error(err); alert('No se pudo eliminar.'); }
    });
  }
}
