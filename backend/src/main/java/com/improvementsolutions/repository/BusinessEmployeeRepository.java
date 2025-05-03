package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessEmployeeRepository extends JpaRepository<BusinessEmployee, Long> {
    
    List<BusinessEmployee> findByBusinessId(Long businessId);
    
    Optional<BusinessEmployee> findByBusinessIdAndEmployeeId(Long businessId, Long employeeId);
    
    List<BusinessEmployee> findByBusinessIdAndStatus(Long businessId, String status);
    
    Optional<BusinessEmployee> findByBusinessIdAndCedula(Long businessId, String cedula);
    
    Boolean existsByBusinessIdAndCedula(Long businessId, String cedula);
    
    @Query("SELECT be FROM BusinessEmployee be WHERE be.business.id = :businessId AND " +
           "(LOWER(be.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(be.cedula) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    List<BusinessEmployee> searchByBusinessIdAndNameOrCedula(Long businessId, String searchTerm);
}