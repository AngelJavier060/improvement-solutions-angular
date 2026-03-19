package com.improvementsolutions.repository;

import com.improvementsolutions.model.EmployeePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EmployeePermissionRepository extends JpaRepository<EmployeePermission, Long> {

    List<EmployeePermission> findByBusiness_IdOrderByPermissionDateDesc(Long businessId);

    List<EmployeePermission> findByBusiness_IdAndPermissionDateBetweenOrderByPermissionDateDesc(
            Long businessId, LocalDate from, LocalDate to);

    List<EmployeePermission> findByEmployee_IdOrderByPermissionDateDesc(Long employeeId);

    List<EmployeePermission> findByEmployee_IdAndPermissionDateBetweenOrderByPermissionDateAsc(
            Long employeeId, LocalDate from, LocalDate to);

    // Overlap check: permisos del empleado cuya fecha cae en [from, to] y no están rechazados
    @org.springframework.data.jpa.repository.Query(
        "SELECT p FROM EmployeePermission p " +
        "WHERE p.employee.id = :employeeId " +
        "AND p.permissionDate >= :from AND p.permissionDate <= :to " +
        "AND UPPER(p.status) <> 'RECHAZADO'")
    List<EmployeePermission> findOverlapping(
        @org.springframework.data.repository.query.Param("employeeId") Long employeeId,
        @org.springframework.data.repository.query.Param("from") LocalDate from,
        @org.springframework.data.repository.query.Param("to") LocalDate to);
}
