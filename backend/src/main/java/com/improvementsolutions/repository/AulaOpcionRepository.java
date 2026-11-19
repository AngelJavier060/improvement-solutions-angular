package com.improvementsolutions.repository;

import com.improvementsolutions.model.aula.AulaOpcion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AulaOpcionRepository extends JpaRepository<AulaOpcion, Long> {
    List<AulaOpcion> findByPreguntaIdOrderByOrdenAsc(Long preguntaId);
    void deleteByPreguntaId(Long preguntaId);
}
