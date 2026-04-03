package com.improvementsolutions.repository;

import com.improvementsolutions.model.EstadoUnidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EstadoUnidadRepository extends JpaRepository<EstadoUnidad, Long> {
    Optional<EstadoUnidad> findByName(String name);
}
