package com.improvementsolutions.repository.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.improvementsolutions.model.inventory.InventoryCategory;

public interface InventoryCategoryRepository extends JpaRepository<InventoryCategory, Long> {
    List<InventoryCategory> findByBusiness_Id(Long businessId);
    Optional<InventoryCategory> findByBusiness_IdAndNameIgnoreCase(Long businessId, String name);
    Optional<InventoryCategory> findByIdAndBusiness_Id(Long id, Long businessId);
}
