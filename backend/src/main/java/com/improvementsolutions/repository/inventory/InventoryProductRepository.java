package com.improvementsolutions.repository.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.improvementsolutions.model.inventory.InventoryProduct;

public interface InventoryProductRepository extends JpaRepository<InventoryProduct, Long> {
    boolean existsByBusiness_IdAndCode(Long businessId, String code);
    boolean existsByBusiness_IdAndCodeIgnoreCase(Long businessId, String code);
    boolean existsByBusiness_IdAndNameIgnoreCase(Long businessId, String name);
    boolean existsByBusiness_IdAndNameIgnoreCaseAndIdNot(Long businessId, String name, Long id);
    boolean existsByBusiness_IdAndCodeIgnoreCaseAndIdNot(Long businessId, String code, Long id);

    @Query("SELECT DISTINCT p FROM InventoryProduct p LEFT JOIN FETCH p.categoryRef WHERE p.business.id = :businessId")
    List<InventoryProduct> findByBusiness_Id(@Param("businessId") Long businessId);

    @Query("SELECT p FROM InventoryProduct p LEFT JOIN FETCH p.categoryRef WHERE p.business.ruc = :ruc AND p.id = :id")
    Optional<InventoryProduct> findByBusiness_RucAndId(@Param("ruc") String ruc, @Param("id") Long id);
}
