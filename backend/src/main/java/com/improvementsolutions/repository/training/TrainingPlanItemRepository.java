package com.improvementsolutions.repository.training;

import com.improvementsolutions.model.training.TrainingPlanItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainingPlanItemRepository extends JpaRepository<TrainingPlanItem, Long> {
    List<TrainingPlanItem> findByPlanIdOrderBySortOrderAscIdAsc(Long planId);
}
