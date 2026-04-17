import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfiguracionComponent } from './configuracion.component';

const routes: Routes = [
  {
    path: '',
    component: ConfiguracionComponent,
    children: [
      {
        path: 'genero',
        loadChildren: () => import('./genero/genero.module').then(m => m.GeneroModule)
      },
      {
        path: 'estudio',
        loadChildren: () => import('./estudio/estudio.module').then(m => m.EstudioModule)
      },
      {
        path: 'estado-civil',
        loadChildren: () => import('./estado-civil/estado-civil.module').then(m => m.EstadoCivilModule)
      },
      {
        path: 'tipo-residencia',
        loadChildren: () => import('./tipo-residencia/tipo-residencia.module').then(m => m.TipoResidenciaModule)
      },
      {
        path: 'etnias',
        loadChildren: () => import('./etnias/etnias.module').then(m => m.EtniasModule)
      },
      {
        path: 'tipo-documento',
        loadChildren: () => import('./tipo-documento/tipo-documento.module').then(m => m.TipoDocumentoModule)
      },
      {
        path: 'departamentos',
        loadChildren: () => import('./departamento/departamento.module').then(m => m.DepartamentoModule)
      },      {
        path: 'cargos',
        loadChildren: () => import('./cargo/cargo.module').then(m => m.CargoModule)
      },
      {
        path: 'iess',
        loadChildren: () => import('./iess/iess.module').then(m => m.IessModule)
      },
      {
        path: 'tipo-contrato',
        loadChildren: () => import('./tipo-contrato/tipo-contrato.module').then(m => m.TipoContratoModule)
      },
      {
        path: 'matriz-legal',
        loadChildren: () => import('./matriz-legal/matriz-legal.module').then(m => m.MatrizLegalModule)
      },
      {
        path: 'empresas-contratistas',
        loadChildren: () => import('./empresas-contratistas/empresas-contratistas.module').then(m => m.EmpresasContratistasModule)
      }
      ,
      {
        path: 'cursos-certificaciones',
        loadChildren: () => import('./cursos-certificaciones/cursos-certificaciones.module').then(m => m.CursosCertificacionesModule)
      },
      {
        path: 'tarjetas',
        loadChildren: () => import('./tarjetas/tarjetas.module').then(m => m.TarjetasModule)
      }
      
      ,
      {
        path: 'inventario-categorias',
        loadChildren: () => import('./inventario-categorias/inventario-categorias.module').then(m => m.InventarioCategoriasModule)
      },
      {
        path: 'inventario-proveedores',
        loadChildren: () => import('./inventario-proveedores/inventario-proveedores.module').then(m => m.InventarioProveedoresModule)
      },
      {
        path: 'jornadas-trabajo',
        loadChildren: () => import('./jornada-trabajo/jornada-trabajo.module').then(m => m.JornadaTrabajoModule)
      },
      {
        path: 'horarios-trabajo',
        loadChildren: () => import('./horario-trabajo/horario-trabajo.module').then(m => m.HorarioTrabajoModule)
      },
      {
        path: 'marca-vehiculo',
        loadChildren: () => import('./marca-vehiculo/marca-vehiculo.module').then(m => m.MarcaVehiculoModule)
      },
      {
        path: 'clase-vehiculo',
        loadChildren: () => import('./clase-vehiculo/clase-vehiculo.module').then(m => m.ClaseVehiculoModule)
      },
      {
        path: 'entidad-remitente',
        loadChildren: () => import('./entidad-remitente/entidad-remitente.module').then(m => m.EntidadRemitenteModule)
      },
      {
        path: 'tipo-vehiculo',
        loadChildren: () => import('./tipo-vehiculo/tipo-vehiculo.module').then(m => m.TipoVehiculoModule)
      },
      {
        path: 'tipo-combustible',
        loadChildren: () => import('./tipo-combustible/tipo-combustible.module').then(m => m.TipoCombustibleModule)
      },
      {
        path: 'color-vehiculo',
        loadChildren: () => import('./color-vehiculo/color-vehiculo.module').then(m => m.ColorVehiculoModule)
      },
      {
        path: 'estado-unidad',
        loadChildren: () => import('./estado-unidad/estado-unidad.module').then(m => m.EstadoUnidadModule)
      },
      {
        path: 'transmision',
        loadChildren: () => import('./transmision/transmision.module').then(m => m.TransmisionModule)
      },
      {
        path: 'propietario-vehiculo',
        loadChildren: () => import('./propietario-vehiculo/propietario-vehiculo.module').then(m => m.PropietarioVehiculoModule)
      },
      {
        path: 'tipo-documento-vehiculo',
        loadChildren: () => import('./tipo-documento-vehiculo/tipo-documento-vehiculo.module').then(m => m.TipoDocumentoVehiculoModule)
      },
      {
        path: 'unidad-medida',
        loadChildren: () => import('./unidad-medida/unidad-medida.module').then(m => m.UnidadMedidaModule)
      },
      {
        path: 'ubicacion-ruta',
        loadChildren: () => import('./ubicacion-ruta/ubicacion-ruta.module').then(m => m.UbicacionRutaModule)
      },
      {
        path: 'pais-origen',
        loadChildren: () => import('./pais-origen/pais-origen.module').then(m => m.PaisOrigenModule)
      },
      {
        path: 'numero-eje',
        loadChildren: () => import('./numero-eje/numero-eje.module').then(m => m.NumeroEjeModule)
      },
      {
        path: 'configuracion-eje',
        loadChildren: () => import('./configuracion-eje/configuracion-eje.module').then(m => m.ConfiguracionEjeModule)
      },
      {
        path: 'distancia-recorrer',
        loadChildren: () => import('./distancia-recorrer/distancia-recorrer.module').then(m => m.DistanciaRecorrerModule)
      },
      {
        path: 'tipo-via',
        loadChildren: () => import('./tipo-via/tipo-via.module').then(m => m.TipoViaModule)
      },
      {
        path: 'condicion-climatica',
        loadChildren: () => import('./condicion-climatica/condicion-climatica.module').then(m => m.CondicionClimaticaModule)
      },
      {
        path: 'horario-circulacion',
        loadChildren: () => import('./horario-circulacion/horario-circulacion.module').then(m => m.HorarioCirculacionModule)
      },
      {
        path: 'estado-carretera',
        loadChildren: () => import('./estado-carretera/estado-carretera.module').then(m => m.EstadoCarreteraModule)
      },
      {
        path: 'tipo-carga',
        loadChildren: () => import('./tipo-carga/tipo-carga.module').then(m => m.TipoCargaModule)
      },
      {
        path: 'hora-conduccion',
        loadChildren: () => import('./hora-conduccion/hora-conduccion.module').then(m => m.HoraConduccionModule)
      },
      {
        path: 'hora-descanso',
        loadChildren: () => import('./hora-descanso/hora-descanso.module').then(m => m.HoraDescansoModule)
      },
      {
        path: 'medio-comunicacion',
        loadChildren: () => import('./medio-comunicacion/medio-comunicacion.module').then(m => m.MedioComunicacionModule)
      },
      {
        path: 'transporta-pasajero',
        loadChildren: () => import('./transporta-pasajero/transporta-pasajero.module').then(m => m.TransportaPasajeroModule)
      },
      {
        path: 'posible-riesgo-via',
        loadChildren: () => import('./posible-riesgo-via/posible-riesgo-via.module').then(m => m.PosibleRiesgoViaModule)
      },
      {
        path: 'otros-peligros-viaje',
        loadChildren: () => import('./otros-peligros-viaje/otros-peligros-viaje.module').then(m => m.OtrosPeligrosViajeModule)
      },
      {
        path: 'medidas-control-tomadas-viaje',
        loadChildren: () => import('./medidas-control-tomadas-viaje/medidas-control-tomadas-viaje.module').then(m => m.MedidasControlTomadasViajeModule)
      },
      {
        path: 'aceptacion-riesgo',
        loadChildren: () => import('./aceptacion-riesgo/aceptacion-riesgo.module').then(m => m.AceptacionRiesgoModule)
      },
      {
        path: 'iso-9001',
        loadChildren: () => import('./iso-9001-gestion/iso-9001-gestion.module').then(m => m.Iso9001GestionModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfiguracionRoutingModule { }
