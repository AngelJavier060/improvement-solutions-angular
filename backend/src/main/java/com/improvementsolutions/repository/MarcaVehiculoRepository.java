package com.improvementsolutions.repository;

import com.improvementsolutions.model.MarcaVehiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MarcaVehiculoRepository extends JpaRepository<MarcaVehiculo, Long> {
    Optional<MarcaVehiculo> findByName(String name);
}
