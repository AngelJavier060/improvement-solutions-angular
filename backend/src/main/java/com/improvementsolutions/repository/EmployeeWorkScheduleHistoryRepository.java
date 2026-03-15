package com.improvementsolutions.repository;

import com.improvementsolutions.model.EmployeeWorkScheduleHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeWorkScheduleHistoryRepository extends JpaRepository<EmployeeWorkScheduleHistory, Long> {

    List<EmployeeWorkScheduleHistory> findByEmployee_IdOrderByStartDateDesc(Long employeeId);

    List<EmployeeWorkScheduleHistory> findByBusiness_IdAndEmployee_IdOrderByStartDateDesc(Long businessId, Long employeeId);

    @Query("SELECT h FROM EmployeeWorkScheduleHistory h " +
           "WHERE h.employee.id = :employeeId " +
           "AND h.startDate <= :date " +
           "AND (h.endDate IS NULL OR h.endDate >= :date) " +
           "ORDER BY h.startDate DESC")
    Optional<EmployeeWorkScheduleHistory> findActiveForDate(@Param("employeeId") Long employeeId,
                                                             @Param("date") LocalDate date);

    @Query("SELECT h FROM EmployeeWorkScheduleHistory h " +
           "WHERE h.employee.id = :employeeId " +
           "AND h.id <> :excludeId " +
           "AND h.startDate <= :endDate " +
           "AND (h.endDate IS NULL OR h.endDate >= :startDate)")
    List<EmployeeWorkScheduleHistory> findOverlapping(@Param("employeeId") Long employeeId,
                                                       @Param("startDate") LocalDate startDate,
                                                       @Param("endDate") LocalDate endDate,
                                                       @Param("excludeId") Long excludeId);

    @Query("SELECT h FROM EmployeeWorkScheduleHistory h " +
           "WHERE h.employee.id = :employeeId " +
           "AND h.startDate <= :endDate " +
           "AND (h.endDate IS NULL OR h.endDate >= :startDate)")
    List<EmployeeWorkScheduleHistory> findOverlappingNew(@Param("employeeId") Long employeeId,
                                                          @Param("startDate") LocalDate startDate,
                                                          @Param("endDate") LocalDate endDate);
}
