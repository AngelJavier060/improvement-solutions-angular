package com.improvementsolutions.repository;

import com.improvementsolutions.model.EmployeeIncident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EmployeeIncidentRepository extends JpaRepository<EmployeeIncident, Long> {

    List<EmployeeIncident> findByBusiness_IdOrderByIncidentDateDesc(Long businessId);

    List<EmployeeIncident> findByBusiness_IdAndIncidentDateBetweenOrderByIncidentDateDesc(
            Long businessId, LocalDate from, LocalDate to);

    List<EmployeeIncident> findByEmployee_IdOrderByIncidentDateDesc(Long employeeId);
}
