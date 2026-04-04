package com.improvementsolutions.repository;

import com.improvementsolutions.model.FleetVehicleDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FleetVehicleDocumentRepository extends JpaRepository<FleetVehicleDocument, Long> {

    List<FleetVehicleDocument> findByFleetVehicle_IdOrderByCreatedAtDesc(Long fleetVehicleId);

    Optional<FleetVehicleDocument> findByIdAndFleetVehicle_Id(Long id, Long fleetVehicleId);
}
