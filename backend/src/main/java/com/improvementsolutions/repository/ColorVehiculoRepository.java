package com.improvementsolutions.repository;

import com.improvementsolutions.model.ColorVehiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ColorVehiculoRepository extends JpaRepository<ColorVehiculo, Long> {
    Optional<ColorVehiculo> findByName(String name);
}
