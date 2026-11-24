import { Component, OnInit } from '@angular/core';
import { BloodType, BloodTypeService } from '../../../../../services/blood-type.service';

@Component({
  selector: 'app-lista-tipo-sangre',
  templateUrl: './lista-tipo-sangre.component.html',
  styleUrls: ['./lista-tipo-sangre.component.scss']
})
export class ListaTipoSangreComponent implements OnInit {
  items: BloodType[] = [];
  loading = false;
  error: string | null = null;
  name = '';
  description = '';
  editingId: number | null = null;

  constructor(private bloodTypeService: BloodTypeService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.bloodTypeService.getAll().subscribe({
      next: data => {
        this.items = data || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los tipos de sangre.';
        this.loading = false;
      }
    });
  }

  save(): void {
    const name = this.name.trim();
    if (!name) {
      this.error = 'Escriba el tipo de sangre.';
      return;
    }
    this.error = null;
    const request = this.editingId
      ? this.bloodTypeService.update(this.editingId, name, this.description.trim())
      : this.bloodTypeService.create(name, this.description.trim());
    request.subscribe({
      next: () => {
        this.name = '';
        this.description = '';
        this.editingId = null;
        this.load();
      },
      error: (err) => {
        this.error = err?.error?.message || 'No se pudo guardar el tipo de sangre.';
      }
    });
  }

  edit(item: BloodType): void {
    this.editingId = item.id;
    this.name = item.name;
    this.description = item.description || '';
  }

  cancel(): void {
    this.editingId = null;
    this.name = '';
    this.description = '';
  }

  remove(item: BloodType): void {
    if (!confirm(`¿Quitar "${item.name}" del catálogo general? Las empresas que ya lo usan dejan de verlo en la lista. El personal ya guardado no se modifica.`)) return;
    this.bloodTypeService.remove(item.id).subscribe({
      next: () => this.load(),
      error: () => {
        this.error = 'No se pudo eliminar. Puede estar asignado a una empresa.';
      }
    });
  }
}
