package com.improvementsolutions.repository.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.improvementsolutions.model.inventory.InventoryProduct;

public interface InventoryProductRepository extends JpaRepository<InventoryProduct, Long> {
    boolean existsByBusiness_IdAndCode(Long businessId, String code);
    boolean existsByBusiness_IdAndCodeIgnoreCase(Long businessId, String code);
    boolean existsByBusiness_IdAndNameIgnoreCase(Long businessId, String name);
    boolean existsByBusiness_IdAndNameIgnoreCaseAndIdNot(Long businessId, String name, Long id);
    boolean existsByBusiness_IdAndCodeIgnoreCaseAndIdNot(Long businessId, String code, Long id);
    List<InventoryProduct> findByBusiness_Id(Long businessId);
    Optional<InventoryProduct> findByBusiness_RucAndId(String ruc, Long id);
}
