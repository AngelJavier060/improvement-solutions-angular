package com.improvementsolutions.repository;

import com.improvementsolutions.model.aula.AulaPregunta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AulaPreguntaRepository extends JpaRepository<AulaPregunta, Long> {
    List<AulaPregunta> findByCursoIdOrderByOrdenAsc(Long cursoId);
    void deleteByCursoId(Long cursoId);
}
