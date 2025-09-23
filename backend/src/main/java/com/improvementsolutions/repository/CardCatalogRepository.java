package com.improvementsolutions.repository;

import com.improvementsolutions.model.CardCatalog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CardCatalogRepository extends JpaRepository<CardCatalog, Long> {
    Optional<CardCatalog> findByName(String name);
}
