package com.improvementsolutions.repository.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.improvementsolutions.model.inventory.InventoryProduct;

public interface InventoryProductRepository extends JpaRepository<InventoryProduct, Long> {
    boolean existsByBusiness_IdAndCode(Long businessId, String code);
    List<InventoryProduct> findByBusiness_Id(Long businessId);
    Optional<InventoryProduct> findByBusiness_RucAndId(String ruc, Long id);
}
