package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BusinessEmployeeCardRepository extends JpaRepository<BusinessEmployeeCard, Long> {
    List<BusinessEmployeeCard> findByBusinessEmployeeId(Long businessEmployeeId);

    @Query("SELECT c FROM BusinessEmployeeCard c WHERE c.businessEmployee.cedula = :cedula")
    List<BusinessEmployeeCard> findByEmployeeCedula(String cedula);

    List<BusinessEmployeeCard> findByBusinessEmployeeIdAndCardIdAndActiveTrue(Long businessEmployeeId, Long cardId);

    @Query("SELECT DISTINCT c FROM BusinessEmployeeCard c " +
           "JOIN FETCH c.businessEmployee be " +
           "JOIN FETCH c.card " +
           "JOIN be.business b " +
           "WHERE b.ruc = :ruc AND c.active = false")
    List<BusinessEmployeeCard> findHistoricByBusinessRuc(@Param("ruc") String ruc);

    @Query("SELECT DISTINCT c FROM BusinessEmployeeCard c " +
           "JOIN FETCH c.businessEmployee be " +
           "JOIN FETCH c.card " +
           "JOIN be.business b " +
           "WHERE b.id = :businessId " +
           "AND (c.active = true OR c.active IS NULL) " +
           "AND (be.status IS NULL OR UPPER(be.status) = 'ACTIVO') " +
           "AND c.expiryDate IS NOT NULL " +
           "AND c.expiryDate BETWEEN :from AND :to")
    List<BusinessEmployeeCard> findActiveExpiringBetween(
            @Param("businessId") Long businessId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
