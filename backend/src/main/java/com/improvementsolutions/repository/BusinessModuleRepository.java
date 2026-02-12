package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessModuleRepository extends JpaRepository<BusinessModule, Long> {

    List<BusinessModule> findByBusinessIdOrderByModuleDisplayOrderAsc(Long businessId);

    Optional<BusinessModule> findByBusinessIdAndModuleId(Long businessId, Long moduleId);

    Optional<BusinessModule> findByBusinessIdAndModuleCode(Long businessId, String moduleCode);

    @Query("SELECT bm FROM BusinessModule bm WHERE bm.business.id = :businessId AND bm.active = true")
    List<BusinessModule> findActiveByBusinessId(@Param("businessId") Long businessId);

    @Query("SELECT bm FROM BusinessModule bm WHERE bm.business.ruc = :ruc AND bm.active = true")
    List<BusinessModule> findActiveByBusinessRuc(@Param("ruc") String ruc);

    @Query("SELECT bm FROM BusinessModule bm WHERE bm.business.ruc = :ruc AND bm.module.code = :moduleCode")
    Optional<BusinessModule> findByBusinessRucAndModuleCode(@Param("ruc") String ruc, @Param("moduleCode") String moduleCode);
}
