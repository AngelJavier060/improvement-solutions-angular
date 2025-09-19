package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessObligationMatrix;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    // Eliminar físicamente duplicados inactivos para evitar violar el índice único (business_id, obligation_matrix_id, active)
    @Modifying
    @Query(value = "DELETE FROM business_obligation_matrices WHERE business_id = :businessId AND obligation_matrix_id = :obligationMatrixId AND active = false", nativeQuery = true)
    void hardDeleteInactiveByBusinessAndCatalog(@Param("businessId") Long businessId, @Param("obligationMatrixId") Long obligationMatrixId);

    // Aplicar soft delete solo al registro activo
    @Modifying
    @Query(value = "UPDATE business_obligation_matrices SET active = false WHERE business_id = :businessId AND obligation_matrix_id = :obligationMatrixId AND active = true", nativeQuery = true)
    int softDeleteActiveByBusinessAndCatalog(@Param("businessId") Long businessId, @Param("obligationMatrixId") Long obligationMatrixId);
}
