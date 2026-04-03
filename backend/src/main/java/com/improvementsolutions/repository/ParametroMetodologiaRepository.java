package com.improvementsolutions.repository;

import com.improvementsolutions.model.ParametroMetodologia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParametroMetodologiaRepository extends JpaRepository<ParametroMetodologia, Long> {
    List<ParametroMetodologia> findByMetodologiaRiesgoIdOrderByDisplayOrderAsc(Long metodologiaRiesgoId);
}
