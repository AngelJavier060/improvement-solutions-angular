package com.improvementsolutions.repository;

import com.improvementsolutions.model.MedidaControlTomadaViaje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MedidaControlTomadaViajeRepository extends JpaRepository<MedidaControlTomadaViaje, Long> {
}
