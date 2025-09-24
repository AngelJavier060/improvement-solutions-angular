package com.improvementsolutions.repository;

import com.improvementsolutions.model.ApprovalRequest;
import com.improvementsolutions.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalRequestRepository extends JpaRepository<ApprovalRequest, Long> {
    List<ApprovalRequest> findByBusiness_Id(Long businessId);
    List<ApprovalRequest> findByBusiness_IdAndStatus(Long businessId, String status);
    List<ApprovalRequest> findByStatus(String status);

    // Limpiar referencias de usuario para permitir su eliminación segura
    @Modifying
    @Query("UPDATE ApprovalRequest ar SET ar.decisionBy = null WHERE ar.decisionBy = :user")
    int clearDecisionByForUser(@Param("user") User user);

    @Modifying
    @Query("DELETE FROM ApprovalRequest ar WHERE ar.requester = :user")
    int deleteByRequester(@Param("user") User user);
}
