package com.improvementsolutions.repository.inventory;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.improvementsolutions.model.inventory.InventoryMovement;

@Repository
public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, Long> {
    
    // Kardex por variante (historial completo)
    @Query("SELECT m FROM InventoryMovement m WHERE m.business.id = ?1 AND m.variant.id = ?2 ORDER BY m.movementDate ASC, m.id ASC")
    List<InventoryMovement> findKardexByVariant(Long businessId, Long variantId);
    
    // Últimos movimientos de una empresa
    @Query("SELECT m FROM InventoryMovement m WHERE m.business.id = ?1 ORDER BY m.movementDate DESC, m.id DESC")
    List<InventoryMovement> findRecentMovements(Long businessId);
}
