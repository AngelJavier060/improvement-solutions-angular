package com.improvementsolutions.repository;

import com.improvementsolutions.model.WorkSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, Long> {

    Optional<WorkSchedule> findByName(String name);

    // Incluye jornadas vinculadas por la tabla many-to-many Y las usadas directamente por empleados de la empresa
    @Query("SELECT DISTINCT ws FROM WorkSchedule ws WHERE ws IN " +
           "(SELECT ws2 FROM WorkSchedule ws2 JOIN ws2.businesses b WHERE b.id = :businessId) " +
           "OR ws IN (SELECT be.workSchedule FROM BusinessEmployee be WHERE be.business.id = :businessId AND be.workSchedule IS NOT NULL)")
    List<WorkSchedule> findByBusinessId(Long businessId);
}
