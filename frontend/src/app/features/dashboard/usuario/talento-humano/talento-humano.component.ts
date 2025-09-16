import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-talento-humano',
  templateUrl: './talento-humano.component.html',
  styleUrls: ['./talento-humano.component.scss']
})
export class TalentoHumanoComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    console.log('Módulo de Talento Humano inicializado');
  }

}