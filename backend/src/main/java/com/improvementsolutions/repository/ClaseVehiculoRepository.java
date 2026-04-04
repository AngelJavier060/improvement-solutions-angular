package com.improvementsolutions.repository;

import com.improvementsolutions.model.ClaseVehiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClaseVehiculoRepository extends JpaRepository<ClaseVehiculo, Long> {
}
