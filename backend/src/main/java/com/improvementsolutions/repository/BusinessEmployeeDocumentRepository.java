package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessEmployeeDocumentRepository extends JpaRepository<BusinessEmployeeDocument, Long> {

    List<BusinessEmployeeDocument> findByBusinessEmployeeId(Long businessEmployeeId);

    @Query("SELECT d FROM BusinessEmployeeDocument d WHERE d.businessEmployee.cedula = :cedula")
    List<BusinessEmployeeDocument> findByEmployeeCedula(String cedula);

    List<BusinessEmployeeDocument> findByBusinessEmployeeIdAndTypeDocumentIdAndActiveTrue(Long businessEmployeeId, Long typeDocumentId);
}
