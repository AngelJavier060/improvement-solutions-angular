package com.improvementsolutions.repository;

import com.improvementsolutions.model.ExpiryAlertSent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExpiryAlertSentRepository extends JpaRepository<ExpiryAlertSent, Long> {

    boolean existsByBusiness_IdAndSourceTypeAndSourceIdAndThresholdDays(
            Long businessId, String sourceType, Long sourceId, Integer thresholdDays);
}
