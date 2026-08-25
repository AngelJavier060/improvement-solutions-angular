package com.improvementsolutions.repository;

import com.improvementsolutions.model.SiteVisitCounter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface SiteVisitCounterRepository extends JpaRepository<SiteVisitCounter, Long> {

    Optional<SiteVisitCounter> findByCounterKey(String counterKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM SiteVisitCounter c WHERE c.counterKey = :key")
    Optional<SiteVisitCounter> findByCounterKeyForUpdate(@Param("key") String key);
}
