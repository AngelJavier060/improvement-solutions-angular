package com.improvementsolutions.repository;

import com.improvementsolutions.model.EmployeeMovement;
import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.MovementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeMovementRepository extends JpaRepository<EmployeeMovement, Long> {
    List<EmployeeMovement> findByBusinessEmployeeOrderByEffectiveDateDescIdDesc(BusinessEmployee businessEmployee);

    List<EmployeeMovement> findByBusinessEmployee_IdOrderByEffectiveDateAscIdAsc(Long businessEmployeeId);

    @Query("SELECT MAX(m.effectiveDate) FROM EmployeeMovement m WHERE m.businessEmployee.id = :employeeId AND m.type = :deactivation")
    Optional<LocalDate> findLatestDeactivationEffectiveDate(
            @Param("employeeId") Long employeeId,
            @Param("deactivation") MovementType deactivation);

    @Query("SELECT m.businessEmployee.id, MAX(m.effectiveDate) FROM EmployeeMovement m "
            + "WHERE m.businessEmployee.id IN :employeeIds AND m.type = :deactivation GROUP BY m.businessEmployee.id")
    List<Object[]> findMaxDeactivationEffectiveDateByEmployeeIds(
            @Param("employeeIds") Collection<Long> employeeIds,
            @Param("deactivation") MovementType deactivation);

    @Query("SELECT m FROM EmployeeMovement m WHERE m.businessEmployee.id = :employeeId AND m.type = :deactivation "
            + "ORDER BY m.effectiveDate DESC, m.id DESC")
    List<EmployeeMovement> findDeactivationsForEmployeeNewestFirst(
            @Param("employeeId") Long employeeId,
            @Param("deactivation") MovementType deactivation,
            Pageable pageable);

    @Query("SELECT m FROM EmployeeMovement m WHERE m.business.id = :businessId ORDER BY m.effectiveDate DESC, m.id DESC")
    List<EmployeeMovement> findAllByBusinessIdOrderByEffectiveDateDesc(@Param("businessId") Long businessId);
}
