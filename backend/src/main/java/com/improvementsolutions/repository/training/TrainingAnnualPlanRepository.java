package com.improvementsolutions.repository.training;

import com.improvementsolutions.model.training.TrainingAnnualPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrainingAnnualPlanRepository extends JpaRepository<TrainingAnnualPlan, Long> {
    Optional<TrainingAnnualPlan> findByBusinessIdAndYearAndProgram(Long businessId, Integer year, String program);
    List<TrainingAnnualPlan> findByBusinessIdAndProgramOrderByYearDesc(Long businessId, String program);
    List<TrainingAnnualPlan> findByYearAndProgramAndStatus(Integer year, String program, String status);
}
