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
}
