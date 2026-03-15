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

    @Query("SELECT ws FROM WorkSchedule ws JOIN ws.businesses b WHERE b.id = :businessId")
    List<WorkSchedule> findByBusinessId(Long businessId);
}
