package com.improvementsolutions.repository.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.improvementsolutions.model.inventory.InventoryLot;

@Repository
public interface InventoryLotRepository extends JpaRepository<InventoryLot, Long> {
    
    // Buscar lote específico
    Optional<InventoryLot> findByBusinessIdAndVariantIdAndLotNumber(Long businessId, Long variantId, String lotNumber);
    
    // Listar lotes de una variante
    List<InventoryLot> findByBusinessIdAndVariantId(Long businessId, Long variantId);
    
    // Lotes con stock disponible
    List<InventoryLot> findByBusinessIdAndVariantIdAndCurrentQtyGreaterThan(Long businessId, Long variantId, java.math.BigDecimal qty);
}
