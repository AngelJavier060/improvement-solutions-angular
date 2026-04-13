package com.improvementsolutions.repository;

import com.improvementsolutions.model.HoraDescanso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HoraDescansoRepository extends JpaRepository<HoraDescanso, Long> {
    Optional<HoraDescanso> findByName(String name);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE HoraDescanso e SET e.neNivel = null, e.ndNivel = null, e.ncNivel = null WHERE e.metodologiaRiesgo.id = :metodologiaId")
    void clearNivelesByMetodologiaId(@Param("metodologiaId") Long metodologiaId);
}
