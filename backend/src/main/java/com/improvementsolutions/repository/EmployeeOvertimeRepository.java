package com.improvementsolutions.repository;

import com.improvementsolutions.model.EmployeeOvertime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EmployeeOvertimeRepository extends JpaRepository<EmployeeOvertime, Long> {

    List<EmployeeOvertime> findByBusiness_IdOrderByOvertimeDateDescCreatedAtDesc(Long businessId);

    List<EmployeeOvertime> findByBusiness_IdAndOvertimeDateBetweenOrderByOvertimeDateDesc(
            Long businessId, LocalDate from, LocalDate to);

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
