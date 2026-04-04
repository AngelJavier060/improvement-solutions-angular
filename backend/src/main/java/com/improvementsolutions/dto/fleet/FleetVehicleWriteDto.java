package com.improvementsolutions.dto.fleet;

import lombok.Data;

/**
 * Payload de creación/edición de ficha de flota (camelCase JSON).
 */
@Data
public class FleetVehicleWriteDto {
    private String codigoEquipo;
    private String placa;
    private Long claseVehiculoId;
    private Long entidadRemitenteId;
    private Long tipoVehiculoId;
    private Long marcaVehiculoId;
    private String modelo;
    private Integer anio;
    private String serieChasis;
    private String serieMotor;
    private Long colorVehiculoId;
    private Long paisOrigenId;
    private Long tipoCombustibleId;
    private Long estadoUnidadId;
    private Long transmisionId;
    private Long numeroEjeId;
    private Long configuracionEjeId;
    private String estadoActivo;
    private String cilindraje;
    private Integer pasajeros;
    private String tonelaje;
    private String capacidad;
    private String potencia;
    private Integer kmInicio;
    private String largo;
    private String ancho;
    private String alto;
    private String proyectoAsignado;
    private String medidaNeumaticos;
    private String marcaNeumatico;
    private String kmReencauche;
    private Integer numeroRepuestos;
    private String observaciones;
    private String fotoPrincipal;
    private String fotoLateral;
    private String fotoInterior;
}
