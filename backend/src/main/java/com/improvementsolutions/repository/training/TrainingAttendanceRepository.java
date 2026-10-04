package com.improvementsolutions.repository.training;

import com.improvementsolutions.model.training.TrainingAttendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface TrainingAttendanceRepository extends JpaRepository<TrainingAttendance, Long> {
    List<TrainingAttendance> findBySessionId(Long sessionId);
    List<TrainingAttendance> findBySessionIdIn(Collection<Long> sessionIds);
    boolean existsBySessionIdAndEmployeeIdAndPresentTrue(Long sessionId, Long employeeId);
}
