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

    @Query("SELECT ws FROM WorkShift ws JOIN ws.businesses b WHERE b.id = :businessId")
    List<WorkShift> findByBusinessId(Long businessId);
}
