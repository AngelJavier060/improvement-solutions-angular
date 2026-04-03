package com.improvementsolutions.repository;

import com.improvementsolutions.model.TipoCombustible;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TipoCombustibleRepository extends JpaRepository<TipoCombustible, Long> {
    Optional<TipoCombustible> findByName(String name);
}
