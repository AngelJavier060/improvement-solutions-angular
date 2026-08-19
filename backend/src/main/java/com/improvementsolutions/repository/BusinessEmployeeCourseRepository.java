package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BusinessEmployeeCourseRepository extends JpaRepository<BusinessEmployeeCourse, Long> {
    List<BusinessEmployeeCourse> findByBusinessEmployeeId(Long businessEmployeeId);

    @Query("SELECT c FROM BusinessEmployeeCourse c WHERE c.businessEmployee.cedula = :cedula")
    List<BusinessEmployeeCourse> findByEmployeeCedula(String cedula);

    List<BusinessEmployeeCourse> findByBusinessEmployeeIdAndCourseCertificationIdAndActiveTrue(Long businessEmployeeId, Long courseCertificationId);

    @Query("SELECT DISTINCT c FROM BusinessEmployeeCourse c " +
           "JOIN FETCH c.businessEmployee be " +
           "JOIN FETCH c.courseCertification " +
           "JOIN be.business b " +
           "WHERE b.ruc = :ruc AND c.active = false")
    List<BusinessEmployeeCourse> findHistoricByBusinessRuc(@Param("ruc") String ruc);

    @Query("SELECT DISTINCT c FROM BusinessEmployeeCourse c " +
           "JOIN FETCH c.businessEmployee be " +
           "JOIN FETCH c.courseCertification " +
           "JOIN be.business b " +
           "WHERE b.id = :businessId " +
           "AND (c.active = true OR c.active IS NULL) " +
           "AND (be.status IS NULL OR UPPER(be.status) = 'ACTIVO') " +
           "AND c.expiryDate IS NOT NULL " +
           "AND c.expiryDate BETWEEN :from AND :to")
    List<BusinessEmployeeCourse> findActiveExpiringBetween(
            @Param("businessId") Long businessId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
