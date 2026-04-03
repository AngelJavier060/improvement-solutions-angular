package com.improvementsolutions.repository;

import com.improvementsolutions.model.HoraConduccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HoraConduccionRepository extends JpaRepository<HoraConduccion, Long> {
    Optional<HoraConduccion> findByName(String name);
}
