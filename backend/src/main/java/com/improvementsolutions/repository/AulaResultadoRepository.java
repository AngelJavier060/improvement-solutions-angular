package com.improvementsolutions.repository;

import com.improvementsolutions.model.aula.AulaResultado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AulaResultadoRepository extends JpaRepository<AulaResultado, Long> {
    List<AulaResultado> findByCursoId(Long cursoId);
    Optional<AulaResultado> findByCursoIdAndEmployeeId(Long cursoId, Long employeeId);
    void deleteByCursoId(Long cursoId);
}
