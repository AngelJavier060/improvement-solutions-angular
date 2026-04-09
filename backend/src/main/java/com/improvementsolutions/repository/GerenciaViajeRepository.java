package com.improvementsolutions.repository;

import com.improvementsolutions.model.GerenciaViaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface GerenciaViajeRepository extends JpaRepository<GerenciaViaje, Long> {

    List<GerenciaViaje> findByBusiness_RucOrderByFechaHoraDesc(String ruc);

    List<GerenciaViaje> findByBusiness_IdOrderByFechaHoraDesc(Long businessId);

    List<GerenciaViaje> findByBusiness_RucAndEstadoOrderByFechaHoraDesc(String ruc, String estado);

    List<GerenciaViaje> findByBusiness_RucAndCedulaOrderByFechaHoraDesc(String ruc, String cedula);

    @Query("SELECT gv FROM GerenciaViaje gv WHERE gv.business.ruc = :ruc " +
           "AND gv.fechaHora BETWEEN :from AND :to ORDER BY gv.fechaHora DESC")
    List<GerenciaViaje> findByRucAndDateRange(
            @Param("ruc") String ruc,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(gv) FROM GerenciaViaje gv WHERE gv.business.id = :businessId " +
           "AND gv.estado = :estado")
    long countByBusinessIdAndEstado(@Param("businessId") Long businessId, @Param("estado") String estado);

    @Query("SELECT COUNT(gv) FROM GerenciaViaje gv WHERE gv.business.id = :businessId")
    long countByBusinessId(@Param("businessId") Long businessId);

    boolean existsByBusiness_IdAndCedulaAndEstado(Long businessId, String cedula, String estado);

    Optional<GerenciaViaje> findFirstByBusiness_RucAndCedulaAndEstadoOrderByFechaHoraDesc(
            String ruc, String cedula, String estado);

    @Query(value = """
            SELECT MAX(g.km_final) FROM gerencias_viajes g
            WHERE g.business_id = :bid
              AND UPPER(TRIM(g.vehiculo_inicio)) = UPPER(TRIM(:placa))
              AND g.estado = 'COMPLETADO'
              AND g.km_final IS NOT NULL
            """, nativeQuery = true)
    Optional<BigDecimal> findMaxKmFinalClosedForPlaca(@Param("bid") Long businessId, @Param("placa") String placa);

    @Query(value = """
            SELECT MAX(g.km_final) FROM gerencias_viajes g
            WHERE g.business_id = :bid
              AND UPPER(TRIM(g.vehiculo_inicio)) = UPPER(TRIM(:placa))
              AND g.estado = 'COMPLETADO'
              AND g.km_final IS NOT NULL
              AND g.id <> :excludeId
            """, nativeQuery = true)
    Optional<BigDecimal> findMaxKmFinalClosedForPlacaExcluding(
            @Param("bid") Long businessId, @Param("placa") String placa, @Param("excludeId") Long excludeId);
}
