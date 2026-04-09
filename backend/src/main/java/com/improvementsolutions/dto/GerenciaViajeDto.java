package com.improvementsolutions.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GerenciaViajeDto {

    private Long id;
    private Long businessId;
    private String businessName;
    private String businessRuc;

    // Código secuencial por empresa (GV-YYYY-####)
    private String codigo;

    // Datos del viaje
    private LocalDateTime fechaHora;
    private String conductor;
    private String cedula;
    private String vehiculoInicio;
    private BigDecimal kmInicial;
    private String telefono;
    private String cargo;
    private String area;
    private String proyecto;
    private String motivo;
    private String origen;
    private String destino;
    private LocalDate fechaSalida;
    private String horaSalida;

    // Validaciones previas
    private String licenciaVigente;
    private String manejoDefensivo;
    private String inspeccionVehiculo;
    private String mediosComunicacion;
    private String testAlcohol;

    // Pasajeros
    private String llevaPasajeros;
    private String pasajeros;

    // Vehículo y convoy
    private String tipoVehiculo;
    private String convoy;
    private String unidadesConvoy;

    // Condiciones de la vía
    private String tipoCarretera;
    private String estadoVia;
    private String clima;
    private String distancia;

    // Carga y peligros
    private String tipoCarga;
    private String otrosPeligros;

    // Jornada del conductor
    private String horasConduccion;
    private String horarioViaje;
    private String descansoConduc;

    // Riesgos y control
    private String riesgosVia;
    private String medidasControl;
    private String paradasPlanificadas;

    // Km final
    private BigDecimal kmFinal;

    private LocalDate fechaCierre;

    // Estado
    private String estado;

    /** Puntos A–J según niveles de la metodología de riesgo asignada a la empresa (solo en GET por id). */
    private Integer scoreA;
    private Integer scoreB;
    private Integer scoreC;
    private Integer scoreD;
    private Integer scoreE;
    private Integer scoreF;
    private Integer scoreG;
    private Integer scoreH;
    private Integer scoreI;
    private Integer scoreJ;
    private Integer scoreTotal;
    /** BAJO, MEDIO, ALTO (derivado de scoreTotal). */
    private String nivelRiesgo;
    /** Etiqueta tipo I, II, III para el cuadro de impresión. */
    private String nivelRiesgoRomano;
    /** Texto de aceptación según nivel (ej. Aceptable con Controles). */
    private String aceptacionGerencia;

    // Auditoría
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
