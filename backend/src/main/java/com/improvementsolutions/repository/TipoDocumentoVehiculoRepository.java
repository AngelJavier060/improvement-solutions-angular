package com.improvementsolutions.repository;

import com.improvementsolutions.model.TipoDocumentoVehiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TipoDocumentoVehiculoRepository extends JpaRepository<TipoDocumentoVehiculo, Long> {
    Optional<TipoDocumentoVehiculo> findByName(String name);
}
