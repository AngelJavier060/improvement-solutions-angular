package com.improvementsolutions.repository;

import com.improvementsolutions.model.PaisOrigen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaisOrigenRepository extends JpaRepository<PaisOrigen, Long> {
    Optional<PaisOrigen> findByName(String name);
}
