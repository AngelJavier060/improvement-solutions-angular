package com.improvementsolutions.repository.inventory;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.improvementsolutions.model.inventory.InventoryOutput;
import com.improvementsolutions.model.inventory.enums.OutputType;

public interface InventoryOutputRepository extends JpaRepository<InventoryOutput, Long> {
    boolean existsByBusinessIdAndOutputNumber(Long businessId, String outputNumber);
    
    List<InventoryOutput> findByBusinessIdOrderByOutputDateDesc(Long businessId);
    
    @Query("SELECT o FROM InventoryOutput o WHERE o.business.id = :businessId AND o.outputDate BETWEEN :startDate AND :endDate ORDER BY o.outputDate DESC")
    List<InventoryOutput> findByBusinessAndDateRange(
        @Param("businessId") Long businessId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
    
    List<InventoryOutput> findByBusinessIdAndOutputTypeOrderByOutputDateDesc(Long businessId, OutputType outputType);
    
    List<InventoryOutput> findByBusinessIdAndEmployeeIdOrderByOutputDateDesc(Long businessId, Long employeeId);
}
