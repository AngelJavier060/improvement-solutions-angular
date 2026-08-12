package com.improvementsolutions.repository;

import com.improvementsolutions.model.EntidadRemitente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EntidadRemitenteRepository extends JpaRepository<EntidadRemitente, Long> {

    /** Todas las entidades remitentes asignadas a la empresa (admin → Mantenimiento). */
    @Query("SELECT e FROM Business b JOIN b.entidadRemitentes e WHERE b.id = :businessId ORDER BY LOWER(e.name) ASC")
    List<EntidadRemitente> findAllAssignedToBusiness(@Param("businessId") Long businessId);
}
