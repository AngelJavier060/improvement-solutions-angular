package com.improvementsolutions.repository.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.improvementsolutions.model.inventory.InventorySupplier;

public interface InventorySupplierRepository extends JpaRepository<InventorySupplier, Long> {
    boolean existsByBusiness_IdAndRuc(Long businessId, String ruc);
    List<InventorySupplier> findByBusiness_Id(Long businessId);
    Optional<InventorySupplier> findByBusiness_RucAndId(String ruc, Long id);
}
