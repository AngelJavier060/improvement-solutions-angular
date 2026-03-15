package com.improvementsolutions.repository;

import com.improvementsolutions.model.EmployeeWorkDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeWorkDayRepository extends JpaRepository<EmployeeWorkDay, Long> {

    List<EmployeeWorkDay> findByBusiness_IdAndWorkDateBetweenOrderByEmployeeIdAscWorkDateAsc(
            Long businessId, LocalDate from, LocalDate to);

    List<EmployeeWorkDay> findByEmployee_IdAndWorkDateBetweenOrderByWorkDateAsc(
            Long employeeId, LocalDate from, LocalDate to);

    Optional<EmployeeWorkDay> findByEmployee_IdAndWorkDate(Long employeeId, LocalDate workDate);

    void deleteByEmployee_IdAndWorkDate(Long employeeId, LocalDate workDate);
}
