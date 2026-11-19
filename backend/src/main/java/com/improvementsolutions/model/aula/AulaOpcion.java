package com.improvementsolutions.model.aula;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "aula_opcion")
@Getter
@Setter
public class AulaOpcion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pregunta_id", nullable = false)
    private Long preguntaId;

    @Column(nullable = false, length = 300)
    private String texto;

    @Column(nullable = false)
    private Boolean correcta = false;

    @Column(nullable = false)
    private Integer orden;
}
