package com.improvementsolutions.repository;

import com.improvementsolutions.model.EntidadRemitente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EntidadRemitenteRepository extends JpaRepository<EntidadRemitente, Long> {
}
