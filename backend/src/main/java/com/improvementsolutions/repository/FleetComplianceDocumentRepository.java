package com.improvementsolutions.repository;

import com.improvementsolutions.model.FleetComplianceDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FleetComplianceDocumentRepository extends JpaRepository<FleetComplianceDocument, Long> {

    List<FleetComplianceDocument> findByFleetVehicle_IdOrderByUpdatedAtDesc(Long fleetVehicleId);

    @Query("SELECT DISTINCT c FROM FleetComplianceDocument c " +
           "LEFT JOIN FETCH c.fleetVehicleDocument " +
           "WHERE c.fleetVehicle.id = :vehicleId " +
           "ORDER BY c.updatedAt DESC")
    List<FleetComplianceDocument> findByFleetVehicleIdWithFile(@Param("vehicleId") Long vehicleId);

    Optional<FleetComplianceDocument> findByIdAndFleetVehicle_Id(Long id, Long fleetVehicleId);

    @Query("SELECT c FROM FleetComplianceDocument c JOIN c.fleetVehicle v JOIN v.business b " +
           "WHERE b.ruc = :ruc ORDER BY c.updatedAt DESC")
    List<FleetComplianceDocument> findByBusinessRuc(@Param("ruc") String ruc);

    boolean existsByFleetVehicleDocument_Id(Long fleetVehicleDocumentId);

    @Query("SELECT DISTINCT d FROM FleetComplianceDocument d " +
           "JOIN FETCH d.fleetVehicle v " +
           "JOIN v.business b " +
           "WHERE b.id = :businessId " +
           "AND (d.active = true OR d.active IS NULL) " +
           "AND (d.historicMode = false OR d.historicMode IS NULL) " +
           "AND d.expiryDate IS NOT NULL " +
           "AND d.expiryDate BETWEEN :from AND :to")
    List<FleetComplianceDocument> findActiveExpiringBetween(
            @Param("businessId") Long businessId,
            @Param("from") java.time.LocalDate from,
            @Param("to") java.time.LocalDate to);
}
