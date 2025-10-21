package com.improvementsolutions.repository.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.improvementsolutions.model.inventory.InventorySubdetail;

public interface InventorySubdetailRepository extends JpaRepository<InventorySubdetail, Long> {
    List<InventorySubdetail> findByVariant_Id(Long variantId);
    Optional<InventorySubdetail> findByIdAndVariant_Id(Long id, Long variantId);
    boolean existsByVariant_IdAndLot(Long variantId, String lot);
}
