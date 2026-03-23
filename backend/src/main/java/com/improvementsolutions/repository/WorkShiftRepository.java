package com.improvementsolutions.repository;

import com.improvementsolutions.model.WorkShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkShiftRepository extends JpaRepository<WorkShift, Long> {

    Optional<WorkShift> findByName(String name);

    // Incluye horarios vinculados por la tabla many-to-many Y los usados directamente por empleados de la empresa
    @Query("SELECT DISTINCT ws FROM WorkShift ws WHERE ws IN " +
           "(SELECT ws2 FROM WorkShift ws2 JOIN ws2.businesses b WHERE b.id = :businessId) " +
           "OR ws IN (SELECT be.workShift FROM BusinessEmployee be WHERE be.business.id = :businessId AND be.workShift IS NOT NULL)")
    List<WorkShift> findByBusinessId(Long businessId);
}
