package com.improvementsolutions.repository;

import com.improvementsolutions.model.TipoVia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TipoViaRepository extends JpaRepository<TipoVia, Long> {
    Optional<TipoVia> findByName(String name);
}
