package com.improvementsolutions.repository;

import com.improvementsolutions.model.UbicacionRuta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UbicacionRutaRepository extends JpaRepository<UbicacionRuta, Long> {
    Optional<UbicacionRuta> findByName(String name);
}
