package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessObligationMatrixFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessObligationMatrixFileRepository extends JpaRepository<BusinessObligationMatrixFile, Long> {
    
    List<BusinessObligationMatrixFile> findByBusinessObligationMatrixId(Long businessObligationMatrixId);
}
