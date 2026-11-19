package com.improvementsolutions.repository;

import com.improvementsolutions.model.aula.AulaCurso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AulaCursoRepository extends JpaRepository<AulaCurso, Long> {
    List<AulaCurso> findByBusinessIdOrderByCreatedAtDesc(Long businessId);
}
