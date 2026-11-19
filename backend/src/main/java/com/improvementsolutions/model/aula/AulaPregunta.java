package com.improvementsolutions.model.aula;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "aula_pregunta")
@Getter
@Setter
public class AulaPregunta {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "curso_id", nullable = false)
    private Long cursoId;

    @Column(nullable = false, length = 500)
    private String texto;

    @Column(nullable = false)
    private Integer orden;
}
