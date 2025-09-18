import { Component, OnInit } from '@angular/core';
import { DashboardUsuarioDataService, DashboardUsuarioData } from '../dashboard-usuario-data.service';

@Component({
  selector: 'app-dashboard-usuario-graficas',
  templateUrl: './dashboard-usuario-graficas.component.html',
  styleUrls: ['./dashboard-usuario-graficas.component.scss']
})
export class DashboardUsuarioGraficasComponent implements OnInit {
  data?: DashboardUsuarioData;
  loading = true;

  constructor(private dataService: DashboardUsuarioDataService) {}

  ngOnInit(): void {
    this.dataService.getDashboardData().subscribe(data => {
      this.data = data;
      this.loading = false;
    });
  }
}
