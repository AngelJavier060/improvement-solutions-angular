package com.improvementsolutions.repository.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.improvementsolutions.model.inventory.CambioEppSolicitud;

public interface CambioEppSolicitudRepository extends JpaRepository<CambioEppSolicitud, Long> {

    List<CambioEppSolicitud> findByBusiness_IdOrderByCreatedAtDesc(Long businessId);

    List<CambioEppSolicitud> findByBusiness_IdAndStatusInOrderByCreatedAtDesc(Long businessId, List<String> statuses);

    Optional<CambioEppSolicitud> findByBusiness_IdAndId(Long businessId, Long id);

    @Query("SELECT COUNT(c) > 0 FROM CambioEppSolicitud c WHERE c.business.id = :businessId AND c.nReporte = :nReporte")
    boolean existsByBusinessIdAndReportNumber(@Param("businessId") Long businessId, @Param("nReporte") String nReporte);

    @Query("SELECT COUNT(c) FROM CambioEppSolicitud c WHERE c.business.id = :businessId AND c.nReporte LIKE :prefix")
    long countByBusinessAndReportePrefix(@Param("businessId") Long businessId, @Param("prefix") String prefix);
}
