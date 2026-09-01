package com.improvementsolutions.repository.inventory;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.improvementsolutions.model.inventory.InventoryOutput;

public interface InventoryOutputRepository extends JpaRepository<InventoryOutput, Long> {
    boolean existsByBusinessIdAndOutputNumber(Long businessId, String outputNumber);

    /** Números de salida de la empresa que empiezan con un prefijo (ej. SAL-2026-). */
    @Query("SELECT o.outputNumber FROM InventoryOutput o WHERE o.business.id = ?1 AND o.outputNumber LIKE CONCAT(?2, '%')")
    List<String> findOutputNumbersByBusinessIdAndPrefix(Long businessId, String prefix);
    
    List<InventoryOutput> findByBusinessIdOrderByOutputDateDesc(Long businessId);
    
    @Query("SELECT o FROM InventoryOutput o WHERE o.business.id = :businessId AND o.outputDate BETWEEN :startDate AND :endDate ORDER BY o.outputDate DESC")
    List<InventoryOutput> findByBusinessAndDateRange(
        @Param("businessId") Long businessId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    List<InventoryOutput> findByBusinessIdAndOutputTypeOrderByOutputDateDesc(Long businessId, String outputType);
    
    List<InventoryOutput> findByBusinessIdAndEmployeeIdOrderByOutputDateDesc(Long businessId, Long employeeId);

    @Query("SELECT o FROM InventoryOutput o WHERE o.business.id = :businessId AND o.outputType = 'PRESTAMO' AND o.status = 'CONFIRMADO' AND (o.returned IS NULL OR o.returned = false)")
    List<InventoryOutput> findActiveLoans(@Param("businessId") Long businessId);
}
