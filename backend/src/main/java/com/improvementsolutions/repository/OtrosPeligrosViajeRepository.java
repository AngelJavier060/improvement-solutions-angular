package com.improvementsolutions.repository;

import com.improvementsolutions.model.OtrosPeligrosViaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OtrosPeligrosViajeRepository extends JpaRepository<OtrosPeligrosViaje, Long> {
}
