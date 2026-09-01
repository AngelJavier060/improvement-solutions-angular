package com.improvementsolutions.repository;

import com.improvementsolutions.model.InventoryEstadoEpi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryEstadoEpiRepository extends JpaRepository<InventoryEstadoEpi, Long> {

    List<InventoryEstadoEpi> findAllByOrderByNameAsc();

    @Query("SELECT t FROM InventoryEstadoEpi t WHERE LOWER(TRIM(t.name)) = LOWER(TRIM(:name))")
    Optional<InventoryEstadoEpi> findByNameIgnoreCase(@Param("name") String name);

    @Query("SELECT CASE WHEN COUNT(t) > 0 THEN true ELSE false END FROM InventoryEstadoEpi t " +
           "WHERE LOWER(TRIM(t.name)) = LOWER(TRIM(:name)) AND (:id IS NULL OR t.id <> :id)")
    boolean existsByNameIgnoreCaseExcludingId(@Param("name") String name, @Param("id") Long id);
}
