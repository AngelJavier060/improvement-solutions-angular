package com.improvementsolutions.repository;

import com.improvementsolutions.model.InventoryEntryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryEntryTypeRepository extends JpaRepository<InventoryEntryType, Long> {

    List<InventoryEntryType> findAllByOrderByNameAsc();

    @Query("SELECT t FROM InventoryEntryType t WHERE LOWER(TRIM(t.name)) = LOWER(TRIM(:name))")
    Optional<InventoryEntryType> findByNameIgnoreCase(@Param("name") String name);

    @Query("SELECT CASE WHEN COUNT(t) > 0 THEN true ELSE false END FROM InventoryEntryType t " +
           "WHERE LOWER(TRIM(t.name)) = LOWER(TRIM(:name)) AND (:id IS NULL OR t.id <> :id)")
    boolean existsByNameIgnoreCaseExcludingId(@Param("name") String name, @Param("id") Long id);
}
