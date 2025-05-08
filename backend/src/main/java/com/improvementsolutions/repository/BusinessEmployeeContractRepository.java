package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessEmployeeContractRepository extends JpaRepository<BusinessEmployeeContract, Long> {
    
    List<BusinessEmployeeContract> findByBusinessEmployeeId(Long businessEmployeeId);
    
    Optional<BusinessEmployeeContract> findByBusinessEmployeeIdAndIsCurrentTrue(Long businessEmployeeId);
    
    List<BusinessEmployeeContract> findByBusinessEmployeeIdOrderByStartDateDesc(Long businessEmployeeId);
    
    List<BusinessEmployeeContract> findByBusinessEmployeeBusinessId(Long businessId);
    
    @Query("SELECT bec FROM BusinessEmployeeContract bec WHERE bec.businessEmployee.business.id = :businessId AND bec.status = :status")
    List<BusinessEmployeeContract> findByBusinessIdAndStatus(Long businessId, String status);
    
    @Query("SELECT bec FROM BusinessEmployeeContract bec WHERE bec.businessEmployee.business.id = :businessId AND bec.endDate BETWEEN :startDate AND :endDate")
    List<BusinessEmployeeContract> findContractsExpiringSoon(Long businessId, LocalDate startDate, LocalDate endDate);
}