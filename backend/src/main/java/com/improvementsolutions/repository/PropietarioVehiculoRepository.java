package com.improvementsolutions.repository;

import com.improvementsolutions.model.PropietarioVehiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PropietarioVehiculoRepository extends JpaRepository<PropietarioVehiculo, Long> {
    Optional<PropietarioVehiculo> findByName(String name);
}
