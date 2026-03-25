package com.improvementsolutions.repository.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.improvementsolutions.model.inventory.InventoryVariant;

public interface InventoryVariantRepository extends JpaRepository<InventoryVariant, Long> {
    boolean existsByProduct_IdAndCode(Long productId, String code);
    List<InventoryVariant> findByProduct_Id(Long productId);
    Optional<InventoryVariant> findByIdAndProduct_Id(Long id, Long productId);

    @Query("SELECT v FROM InventoryVariant v JOIN v.product p WHERE p.business.id = :businessId AND v.minQty IS NOT NULL AND v.currentQty <= v.minQty AND v.status = 'ACTIVO'")
    List<InventoryVariant> findLowStockByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT v FROM InventoryVariant v JOIN v.product p WHERE p.business.id = :businessId AND v.status = 'ACTIVO'")
    List<InventoryVariant> findAllActiveByBusinessId(@Param("businessId") Long businessId);
}
