package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BusinessEmployeeContractRepository extends JpaRepository<BusinessEmployeeContract, Long> {

    List<BusinessEmployeeContract> findByBusinessEmployeeId(Long businessEmployeeId);

    @Query("SELECT c FROM BusinessEmployeeContract c WHERE c.businessEmployee.cedula = :cedula")
    List<BusinessEmployeeContract> findByEmployeeCedula(String cedula);

    // Para desasociar contratos de un cargo específico antes de eliminar el cargo
    List<BusinessEmployeeContract> findByPositionId(Long positionId);

    @Query("SELECT DISTINCT c FROM BusinessEmployeeContract c " +
           "JOIN FETCH c.businessEmployee be " +
           "JOIN FETCH c.typeContract " +
           "JOIN be.business b " +
           "WHERE b.id = :businessId " +
           "AND (c.active = true OR c.active IS NULL) " +
           "AND (be.status IS NULL OR UPPER(be.status) = 'ACTIVO') " +
           "AND c.endDate IS NOT NULL " +
           "AND c.endDate BETWEEN :from AND :to")
    List<BusinessEmployeeContract> findActiveExpiringBetween(
            @Param("businessId") Long businessId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
