package com.improvementsolutions.repository;

import com.improvementsolutions.model.TipoVia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TipoViaRepository extends JpaRepository<TipoVia, Long> {
    Optional<TipoVia> findByName(String name);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE TipoVia t SET t.neNivel = null, t.ndNivel = null, t.ncNivel = null WHERE t.metodologiaRiesgo.id = :metodologiaId")
    void clearNivelesByMetodologiaId(@Param("metodologiaId") Long metodologiaId);
}
