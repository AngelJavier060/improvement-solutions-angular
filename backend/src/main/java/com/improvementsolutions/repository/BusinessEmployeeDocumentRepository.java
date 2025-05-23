package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessEmployeeDocumentRepository extends JpaRepository<BusinessEmployeeDocument, Long> {
    
    List<BusinessEmployeeDocument> findByBusinessEmployeeId(Long businessEmployeeId);
    
    List<BusinessEmployeeDocument> findByBusinessEmployeeIdAndTypeDocumentId(Long businessEmployeeId, Long typeDocumentId);
    
    @Query("SELECT bed FROM BusinessEmployeeDocument bed " +
           "WHERE bed.businessEmployee.business.id = :businessId AND bed.status = :status")
    List<BusinessEmployeeDocument> findByBusinessIdAndStatus(Long businessId, String status);
}
