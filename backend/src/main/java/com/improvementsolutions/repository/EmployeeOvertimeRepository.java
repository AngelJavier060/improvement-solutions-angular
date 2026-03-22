package com.improvementsolutions.repository;

import com.improvementsolutions.model.EmployeeOvertime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EmployeeOvertimeRepository extends JpaRepository<EmployeeOvertime, Long> {

    List<EmployeeOvertime> findByBusiness_IdOrderByOvertimeDateDescCreatedAtDesc(Long businessId);

    List<EmployeeOvertime> findByBusiness_IdAndOvertimeDateBetweenOrderByOvertimeDateDesc(
            Long businessId, LocalDate from, LocalDate to);

    @Query("SELECT DISTINCT o FROM EmployeeOvertime o JOIN FETCH o.employee e LEFT JOIN FETCH e.department "
            + "WHERE o.business.id = :businessId AND o.overtimeDate BETWEEN :from AND :to "
            + "ORDER BY o.overtimeDate ASC, o.id ASC")
    List<EmployeeOvertime> findByBusinessAndDateRangeWithEmployee(
            @Param("businessId") Long businessId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    List<EmployeeOvertime> findByEmployee_IdAndOvertimeDateBetweenOrderByOvertimeDateAsc(
            Long employeeId, LocalDate from, LocalDate to);

    List<EmployeeOvertime> findByEmployee_IdOrderByOvertimeDateDesc(Long employeeId);

    // Overlap check: horas extra del empleado cuya fecha cae en [from, to]
    @org.springframework.data.jpa.repository.Query(
        "SELECT o FROM EmployeeOvertime o " +
        "WHERE o.employee.id = :employeeId " +
        "AND o.overtimeDate >= :from AND o.overtimeDate <= :to")
    List<EmployeeOvertime> findOverlapping(
        @org.springframework.data.repository.query.Param("employeeId") Long employeeId,
        @org.springframework.data.repository.query.Param("from") LocalDate from,
        @org.springframework.data.repository.query.Param("to") LocalDate to);
}
