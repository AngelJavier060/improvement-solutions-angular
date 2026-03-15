package com.improvementsolutions.repository.inventory;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.improvementsolutions.model.inventory.InventoryCategoryGlobal;

public interface InventoryCategoryGlobalRepository extends JpaRepository<InventoryCategoryGlobal, Long> {
    Optional<InventoryCategoryGlobal> findByNameIgnoreCase(String name);
}
