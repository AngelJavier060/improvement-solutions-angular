package com.improvementsolutions.repository;

import com.improvementsolutions.model.MedioComunicacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MedioComunicacionRepository extends JpaRepository<MedioComunicacion, Long> {
    Optional<MedioComunicacion> findByName(String name);
}
