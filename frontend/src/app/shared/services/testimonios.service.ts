import { Injectable } from '@angular/core';

export interface Testimonio {
  id: number;
  nombre: string;
  cargo: string;
  imagen: string;
  texto: string;
  estrellas: number;
}

@Injectable({
  providedIn: 'root'
})
export class TestimoniosService {
  private testimonios: Testimonio[] = [
    {
      id: 1,
      nombre: 'Ángel Guerrero',
      cargo: 'Magister en SSO',
      imagen: 'assets/img/Javier.jpg',
      texto: 'Con Improvement Solutions logramos poner en orden la gestión de Seguridad, Salud, Medio Ambiente y Calidad, todo en un solo sistema. Ya no manejamos información dispersa: ahora tenemos datos estadísticos claros y actualizados que nos ayudan a tomar mejores decisiones y a cumplir con la normativa vigente sin complicaciones.',
      estrellas: 5
    },
    {
      id: 2,
      nombre: 'Alexandra Torres',
      cargo: 'Ingeniera Industrial',
      imagen: 'assets/img/testimonio-elvia.jpg',
      texto: 'Desde que implementamos el sistema de la empresa Improvement Solutions, hemos experimentado una mejora significativa en la eficiencia de nuestros procesos. Este sistema ha simplificado y automatizado muchas de nuestras tareas diarias.',
      estrellas: 5
    },
    {
      id: 3,
      nombre: 'Miguel Sánchez',
      cargo: 'Ingeniero de Calidad',
      imagen: 'assets/img/testimonio-miguel.jpg',
      texto: 'Con el sistema implementado por Improvement Solutions, hemos reducido significativamente el tiempo dedicado a la gestión de la Seguridad y la Calidad. La capacidad de acceder a datos estadísticos precisos nos ha brindado una visión más clara.',
      estrellas: 5
    }
  ];

  constructor() { }

  getTestimonios(): Testimonio[] {
    return this.testimonios;
  }
}