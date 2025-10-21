package com.improvementsolutions.repository.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.improvementsolutions.model.inventory.InventoryVariant;

public interface InventoryVariantRepository extends JpaRepository<InventoryVariant, Long> {
    boolean existsByProduct_IdAndCode(Long productId, String code);
    List<InventoryVariant> findByProduct_Id(Long productId);
    Optional<InventoryVariant> findByIdAndProduct_Id(Long id, Long productId);
}
