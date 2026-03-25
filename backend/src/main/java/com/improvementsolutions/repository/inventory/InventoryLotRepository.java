package com.improvementsolutions.repository.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("SELECT l FROM InventoryLot l WHERE l.business.id = :businessId AND l.status = 'ACTIVO' AND l.expirationDate IS NOT NULL AND l.expirationDate <= :limitDate ORDER BY l.expirationDate ASC")
    List<InventoryLot> findExpiringLots(@Param("businessId") Long businessId, @Param("limitDate") java.time.LocalDate limitDate);

    @Query("SELECT l FROM InventoryLot l WHERE l.business.id = :businessId AND l.status = 'VENCIDO' ORDER BY l.expirationDate ASC")
    List<InventoryLot> findExpiredLots(@Param("businessId") Long businessId);
}
