package com.improvementsolutions.repository;

import com.improvementsolutions.model.EmployeeVacation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EmployeeVacationRepository extends JpaRepository<EmployeeVacation, Long> {

    List<EmployeeVacation> findByBusiness_IdOrderByStartDateDesc(Long businessId);

    List<EmployeeVacation> findByBusiness_IdAndStartDateBetweenOrderByStartDateDesc(
            Long businessId, LocalDate from, LocalDate to);

    List<EmployeeVacation> findByEmployee_IdOrderByStartDateDesc(Long employeeId);

    // Overlap check: vacaciones del empleado cuyo rango se superpone con [from, to] y no están rechazadas
    @org.springframework.data.jpa.repository.Query(
        "SELECT v FROM EmployeeVacation v " +
        "WHERE v.employee.id = :employeeId " +
        "AND v.startDate <= :to AND v.endDate >= :from " +
        "AND UPPER(v.status) <> 'RECHAZADO'")
    List<EmployeeVacation> findOverlapping(
        @org.springframework.data.repository.query.Param("employeeId") Long employeeId,
        @org.springframework.data.repository.query.Param("from") LocalDate from,
        @org.springframework.data.repository.query.Param("to") LocalDate to);
}
