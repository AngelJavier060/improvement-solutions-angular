package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessObligationMatrix;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BusinessObligationMatrixRepository extends JpaRepository<BusinessObligationMatrix, Long> {
    
    List<BusinessObligationMatrix> findByBusinessId(Long businessId);
    
    List<BusinessObligationMatrix> findByBusinessIdAndStatus(Long businessId, String status);
    
    @Query("SELECT bom FROM BusinessObligationMatrix bom WHERE bom.business.id = :businessId AND bom.dueDate BETWEEN :startDate AND :endDate")
    List<BusinessObligationMatrix> findObligationsWithDueDateInRange(Long businessId, LocalDate startDate, LocalDate endDate);
    
    @Query("SELECT bom FROM BusinessObligationMatrix bom WHERE bom.business.id = :businessId AND " +
           "(LOWER(bom.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(bom.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    List<BusinessObligationMatrix> searchByNameOrDescription(Long businessId, String searchTerm);
}