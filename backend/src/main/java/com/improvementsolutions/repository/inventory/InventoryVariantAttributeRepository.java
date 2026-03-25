package com.improvementsolutions.repository.inventory;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.improvementsolutions.model.inventory.InventoryVariantAttribute;

public interface InventoryVariantAttributeRepository extends JpaRepository<InventoryVariantAttribute, Long> {
    List<InventoryVariantAttribute> findByVariant_Id(Long variantId);
    void deleteByVariant_Id(Long variantId);
}
