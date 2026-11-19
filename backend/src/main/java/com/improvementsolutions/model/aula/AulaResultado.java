package com.improvementsolutions.model.aula;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "aula_resultado", uniqueConstraints = @UniqueConstraint(columnNames = {"curso_id", "employee_id"}))
@Getter
@Setter
public class AulaResultado {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "curso_id", nullable = false)
    private Long cursoId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "preguntas_json", columnDefinition = "TEXT")
    private String preguntasJson;

    @Column(name = "respuestas_json", columnDefinition = "TEXT")
    private String respuestasJson;

    private Integer nota;

    @Column(name = "intentos_usados", nullable = false)
    private Integer intentosUsados = 0;

    @Column(nullable = false, length = 30)
    private String estado = "PENDIENTE";

    @Column(name = "video_visto", nullable = false)
    private Boolean videoVisto = false;

    @Column(name = "ingreso_sala", nullable = false)
    private Boolean ingresoSala = false;

    private LocalDateTime fecha;
}
