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

    /**
     * Carga los registros de trabajo guardados para un rango de fechas junto con el empleado,
     * su turno y su departamento en una sola consulta (evita N+1 y auto-generación de días).
     * Solo devuelve días realmente registrados por el usuario en la base de datos.
     */
    @Query("SELECT wd FROM EmployeeWorkDay wd " +
           "JOIN FETCH wd.employee emp " +
           "LEFT JOIN FETCH emp.workShift " +
           "LEFT JOIN FETCH emp.department " +
           "WHERE wd.business.id = :businessId " +
           "  AND wd.workDate BETWEEN :from AND :to " +
           "ORDER BY wd.workDate ASC, emp.id ASC")
    List<EmployeeWorkDay> findWithEmployeeByBusinessIdAndDateBetween(
            @Param("businessId") Long businessId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
