package com.improvementsolutions.repository.inventory;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.improvementsolutions.model.inventory.InventorySupplierGlobal;

public interface InventorySupplierGlobalRepository extends JpaRepository<InventorySupplierGlobal, Long> {
    Optional<InventorySupplierGlobal> findByRuc(String ruc);
    Optional<InventorySupplierGlobal> findByNameIgnoreCase(String name);
}
