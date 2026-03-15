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
}
