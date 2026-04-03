package com.improvementsolutions.repository;

import com.improvementsolutions.model.HorarioCirculacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HorarioCirculacionRepository extends JpaRepository<HorarioCirculacion, Long> {
    Optional<HorarioCirculacion> findByName(String name);
}
