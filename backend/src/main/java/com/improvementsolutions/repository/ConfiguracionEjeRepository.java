package com.improvementsolutions.repository;

import com.improvementsolutions.model.ConfiguracionEje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracionEjeRepository extends JpaRepository<ConfiguracionEje, Long> {
}
