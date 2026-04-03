package com.improvementsolutions.repository;

import com.improvementsolutions.model.EstadoCarretera;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EstadoCarreteraRepository extends JpaRepository<EstadoCarretera, Long> {
    Optional<EstadoCarretera> findByName(String name);
}
