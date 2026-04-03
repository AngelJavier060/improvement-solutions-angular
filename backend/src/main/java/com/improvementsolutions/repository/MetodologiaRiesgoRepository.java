package com.improvementsolutions.repository;

import com.improvementsolutions.model.MetodologiaRiesgo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MetodologiaRiesgoRepository extends JpaRepository<MetodologiaRiesgo, Long> {
    Optional<MetodologiaRiesgo> findByName(String name);
}
