package com.improvementsolutions.repository;

import com.improvementsolutions.model.TipoCarga;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TipoCargaRepository extends JpaRepository<TipoCarga, Long> {
    Optional<TipoCarga> findByName(String name);
}
