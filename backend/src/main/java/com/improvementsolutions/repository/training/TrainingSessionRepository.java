package com.improvementsolutions.repository.training;

import com.improvementsolutions.model.training.TrainingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {
    List<TrainingSession> findByPlanIdOrderBySessionDateDescIdDesc(Long planId);
    List<TrainingSession> findByItemIdOrderBySessionDateDesc(Long itemId);
}
