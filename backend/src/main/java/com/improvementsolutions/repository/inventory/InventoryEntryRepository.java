package com.improvementsolutions.repository.inventory;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.improvementsolutions.model.inventory.InventoryEntry;
import com.improvementsolutions.model.inventory.enums.EntryStatus;

@Repository
public interface InventoryEntryRepository extends JpaRepository<InventoryEntry, Long> {
    
    // Buscar entradas por empresa
    List<InventoryEntry> findByBusinessIdOrderByEntryDateDesc(Long businessId);
    
    // Buscar por empresa y rango de fechas
    @Query("SELECT e FROM InventoryEntry e WHERE e.business.id = ?1 AND e.entryDate BETWEEN ?2 AND ?3 ORDER BY e.entryDate DESC")
    List<InventoryEntry> findByBusinessAndDateRange(Long businessId, LocalDate startDate, LocalDate endDate);
    
    // Buscar por empresa y proveedor
    List<InventoryEntry> findByBusinessIdAndSupplierIdOrderByEntryDateDesc(Long businessId, Long supplierId);
    
    // Buscar por empresa y estado
    List<InventoryEntry> findByBusinessIdAndStatusOrderByEntryDateDesc(Long businessId, EntryStatus status);
    
    // Verificar si existe un número de entrada para una empresa
    boolean existsByBusinessIdAndEntryNumber(Long businessId, String entryNumber);
}
