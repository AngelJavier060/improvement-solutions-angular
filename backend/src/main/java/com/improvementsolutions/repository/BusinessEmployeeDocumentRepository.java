package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BusinessEmployeeDocumentRepository extends JpaRepository<BusinessEmployeeDocument, Long> {

    List<BusinessEmployeeDocument> findByBusinessEmployeeId(Long businessEmployeeId);

    @Query("SELECT d FROM BusinessEmployeeDocument d WHERE d.businessEmployee.cedula = :cedula")
    List<BusinessEmployeeDocument> findByEmployeeCedula(String cedula);

    List<BusinessEmployeeDocument> findByBusinessEmployeeIdAndTypeDocumentIdAndActiveTrue(Long businessEmployeeId, Long typeDocumentId);

    @Query("SELECT DISTINCT d FROM BusinessEmployeeDocument d " +
           "JOIN FETCH d.businessEmployee be " +
           "JOIN FETCH d.typeDocument " +
           "JOIN be.business b " +
           "WHERE b.id = :businessId " +
           "AND (d.active = true OR d.active IS NULL) " +
           "AND (be.status IS NULL OR UPPER(be.status) = 'ACTIVO') " +
           "AND d.endDate IS NOT NULL " +
           "AND d.endDate BETWEEN :from AND :to")
    List<BusinessEmployeeDocument> findActiveExpiringBetween(
            @Param("businessId") Long businessId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
