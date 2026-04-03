package com.improvementsolutions.repository;

import com.improvementsolutions.model.DistanciaRecorrer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DistanciaRecorrerRepository extends JpaRepository<DistanciaRecorrer, Long> {
    Optional<DistanciaRecorrer> findByName(String name);
}
