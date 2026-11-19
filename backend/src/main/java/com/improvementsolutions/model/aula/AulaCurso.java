package com.improvementsolutions.model.aula;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "aula_curso")
@Getter
@Setter
public class AulaCurso {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Column(nullable = false, length = 180)
    private String titulo;

    @Column(nullable = false, length = 80)
    private String area;

    @Column(nullable = false, length = 40)
    private String audiencia;

    @Column(name = "audiencia_detalle", length = 160)
    private String audienciaDetalle;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;

    @Column(name = "hora_limite")
    private LocalDateTime horaLimite;

    @Column(name = "hora_reunion")
    private LocalDateTime horaReunion;

    private Integer cupo;

    @Column(name = "en_vivo", nullable = false)
    private Boolean enVivo = false;

    @Column(length = 20)
    private String tipo;

    @Column(length = 120)
    private String sala;

    @Column(name = "video_path")
    private String videoPath;

    @Column(name = "video_nombre", length = 180)
    private String videoNombre;

    @Column(name = "material_path")
    private String materialPath;

    @Column(name = "material_nombre", length = 180)
    private String materialNombre;

    @Column(name = "nota_minima", nullable = false)
    private Integer notaMinima = 80;

    @Column(nullable = false)
    private Integer intentos = 2;

    @Column(name = "minutos_evaluacion")
    private Integer minutosEvaluacion = 10;

    @Column(name = "por_trabajador", nullable = false)
    private Integer porTrabajador = 5;

    @Column(nullable = false, length = 20)
    private String estado = "PUBLICADO";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
