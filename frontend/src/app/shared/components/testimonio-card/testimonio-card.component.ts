import { Component, Input } from '@angular/core';
import { Testimonio } from '../../services/testimonios.service';

@Component({
  selector: 'app-testimonio-card',
  templateUrl: './testimonio-card.component.html',
  styleUrls: ['./testimonio-card.component.scss']
})
export class TestimonioCardComponent {
  @Input() testimonio!: Testimonio;
  
  getEstrellas(): number[] {
    return Array(this.testimonio.estrellas);
  }
}