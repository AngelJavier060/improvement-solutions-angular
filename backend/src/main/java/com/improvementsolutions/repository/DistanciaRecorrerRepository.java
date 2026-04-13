package com.improvementsolutions.repository;

import com.improvementsolutions.model.DistanciaRecorrer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DistanciaRecorrerRepository extends JpaRepository<DistanciaRecorrer, Long> {
    Optional<DistanciaRecorrer> findByName(String name);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE DistanciaRecorrer d SET d.neNivel = null, d.ndNivel = null, d.ncNivel = null WHERE d.metodologiaRiesgo.id = :metodologiaId")
    void clearNivelesByMetodologiaId(@Param("metodologiaId") Long metodologiaId);
}
