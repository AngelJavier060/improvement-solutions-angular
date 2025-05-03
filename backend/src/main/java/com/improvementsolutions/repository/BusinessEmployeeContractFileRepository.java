package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeContractFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessEmployeeContractFileRepository extends JpaRepository<BusinessEmployeeContractFile, Long> {
    
    List<BusinessEmployeeContractFile> findByBusinessEmployeeContractId(Long businessEmployeeContractId);
}