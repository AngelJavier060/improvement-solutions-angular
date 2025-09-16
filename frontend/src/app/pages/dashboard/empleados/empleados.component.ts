import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="bg-white rounded-lg shadow-lg p-8 text-center">
        <div class="mb-6">
          <i class="fas fa-users text-6xl text-blue-600 mb-4"></i>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Talento Humano</h1>
          <p class="text-lg text-gray-600">Gestión completa de recursos humanos</p>
        </div>
        
        <div class="grid md:grid-cols-2 gap-6 mt-8">
          <div class="bg-blue-50 rounded-lg p-6">
            <i class="fas fa-user-plus text-3xl text-blue-600 mb-3"></i>
            <h3 class="text-xl font-semibold mb-2">Personal Activo</h3>
            <p class="text-gray-600">Gestión de empleados activos</p>
            <span class="inline-block bg-blue-600 text-white px-4 py-2 rounded mt-4">
              Próximamente
            </span>
          </div>
          
          <div class="bg-gray-50 rounded-lg p-6">
            <i class="fas fa-user-minus text-3xl text-gray-600 mb-3"></i>
            <h3 class="text-xl font-semibold mb-2">Personal Inactivo</h3>
            <p class="text-gray-600">Gestión de empleados inactivos</p>
            <span class="inline-block bg-gray-600 text-white px-4 py-2 rounded mt-4">
              Próximamente
            </span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EmpleadosComponent {
}
