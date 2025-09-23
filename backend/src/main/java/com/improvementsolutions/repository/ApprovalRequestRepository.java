package com.improvementsolutions.repository;

import com.improvementsolutions.model.ApprovalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, Long> {
    List<ApprovalRequest> findByBusiness_Id(Long businessId);
    List<ApprovalRequest> findByBusiness_IdAndStatus(Long businessId, String status);
    List<ApprovalRequest> findByStatus(String status);
}
