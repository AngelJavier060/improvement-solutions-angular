package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeDocumentFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessEmployeeDocumentFileRepository extends JpaRepository<BusinessEmployeeDocumentFile, Long> {
    
    List<BusinessEmployeeDocumentFile> findByBusinessEmployeeDocumentId(Long businessEmployeeDocumentId);
}