package com.improvementsolutions.repository;

import com.improvementsolutions.model.OvertimeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface OvertimeRequestRepository extends JpaRepository<OvertimeRequest, Long> {

    @Query("SELECT r FROM OvertimeRequest r WHERE r.business.id = :businessId ORDER BY r.createdAt DESC")
    List<OvertimeRequest> findByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT r FROM OvertimeRequest r WHERE r.business.id = :businessId " +
           "AND r.reportPeriod = :period ORDER BY r.createdAt DESC")
    List<OvertimeRequest> findByBusinessIdAndPeriod(@Param("businessId") Long businessId,
                                                     @Param("period") String period);

    @Query("SELECT r FROM OvertimeRequest r WHERE r.business.id = :businessId " +
           "AND r.employee.id = :employeeId ORDER BY r.createdAt DESC")
    List<OvertimeRequest> findByBusinessIdAndEmployeeId(@Param("businessId") Long businessId,
                                                         @Param("employeeId") Long employeeId);
}
