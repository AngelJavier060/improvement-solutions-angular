package com.improvementsolutions.repository;

import com.improvementsolutions.model.Iso9001CatalogItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface Iso9001CatalogItemRepository extends JpaRepository<Iso9001CatalogItem, Long> {

    List<Iso9001CatalogItem> findByCatalogCodeOrderByIdAsc(String catalogCode);

    Optional<Iso9001CatalogItem> findByCatalogCodeAndId(String catalogCode, Long id);

    Optional<Iso9001CatalogItem> findByCatalogCodeAndName(String catalogCode, String name);

    boolean existsByCatalogCodeAndNameAndIdNot(String catalogCode, String name, Long id);
}
