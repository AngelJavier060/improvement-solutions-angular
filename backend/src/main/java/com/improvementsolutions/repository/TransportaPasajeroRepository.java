package com.improvementsolutions.repository;

import com.improvementsolutions.model.TransportaPasajero;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransportaPasajeroRepository extends JpaRepository<TransportaPasajero, Long> {
    Optional<TransportaPasajero> findByName(String name);
}
