package com.improvementsolutions.repository;

import com.improvementsolutions.model.SiteVisitLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SiteVisitLogRepository extends JpaRepository<SiteVisitLog, Long> {

    List<SiteVisitLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByIpAddressAndCreatedAtAfter(String ipAddress, LocalDateTime after);

    @Query("SELECT COUNT(DISTINCT l.ipAddress) FROM SiteVisitLog l WHERE l.createdAt >= :after")
    long countDistinctIpsSince(@Param("after") LocalDateTime after);
}
