package com.improvementsolutions.repository;

import com.improvementsolutions.model.TipoDocumentoVehiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TipoDocumentoVehiculoRepository extends JpaRepository<TipoDocumentoVehiculo, Long> {
    Optional<TipoDocumentoVehiculo> findByName(String name);

    @Query("SELECT t FROM Business b JOIN b.tipoDocumentoVehiculos t WHERE b.id = :businessId ORDER BY LOWER(t.name) ASC")
    List<TipoDocumentoVehiculo> findAllAssignedToBusiness(@Param("businessId") Long businessId);
}
