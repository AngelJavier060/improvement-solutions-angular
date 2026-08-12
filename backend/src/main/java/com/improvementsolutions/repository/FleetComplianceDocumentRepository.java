package com.improvementsolutions.repository;

import com.improvementsolutions.model.FleetComplianceDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FleetComplianceDocumentRepository extends JpaRepository<FleetComplianceDocument, Long> {

    List<FleetComplianceDocument> findByFleetVehicle_IdOrderByUpdatedAtDesc(Long fleetVehicleId);

    Optional<FleetComplianceDocument> findByIdAndFleetVehicle_Id(Long id, Long fleetVehicleId);

    @Query("SELECT c FROM FleetComplianceDocument c JOIN c.fleetVehicle v JOIN v.business b " +
           "WHERE b.ruc = :ruc ORDER BY c.updatedAt DESC")
    List<FleetComplianceDocument> findByBusinessRuc(@Param("ruc") String ruc);

    boolean existsByFleetVehicleDocument_Id(Long fleetVehicleDocumentId);
}
