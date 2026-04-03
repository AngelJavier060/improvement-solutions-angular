package com.improvementsolutions.repository;

import com.improvementsolutions.model.CondicionClimatica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CondicionClimaticaRepository extends JpaRepository<CondicionClimatica, Long> {
    Optional<CondicionClimatica> findByName(String name);
}
