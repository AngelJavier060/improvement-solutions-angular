package com.improvementsolutions.repository;

import com.improvementsolutions.model.FleetVehicle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FleetVehicleRepository extends JpaRepository<FleetVehicle, Long> {

    @EntityGraph(attributePaths = {
        "claseVehiculo", "entidadRemitente",
        "tipoVehiculo", "marcaVehiculo", "colorVehiculo", "paisOrigen",
        "tipoCombustible", "estadoUnidad", "transmision", "numeroEje", "configuracionEje"
    })
    Page<FleetVehicle> findByBusiness_IdOrderByUpdatedAtDesc(Long businessId, Pageable pageable);

    @EntityGraph(attributePaths = {
        "claseVehiculo", "entidadRemitente",
        "tipoVehiculo", "marcaVehiculo", "colorVehiculo", "paisOrigen",
        "tipoCombustible", "estadoUnidad", "transmision", "numeroEje", "configuracionEje"
    })
    Optional<FleetVehicle> findByIdAndBusiness_Id(Long id, Long businessId);

    boolean existsByBusiness_IdAndPlacaIgnoreCase(Long businessId, String placa);

    boolean existsByBusiness_IdAndCodigoEquipoIgnoreCase(Long businessId, String codigoEquipo);

    boolean existsByBusiness_IdAndPlacaIgnoreCaseAndIdNot(Long businessId, String placa, Long id);

    boolean existsByBusiness_IdAndCodigoEquipoIgnoreCaseAndIdNot(Long businessId, String codigoEquipo, Long id);

    long countByBusiness_IdAndEstadoActivo(Long businessId, String estadoActivo);

    long countByBusiness_Id(Long businessId);
}
