package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessObligationMatrixVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessObligationMatrixVersionRepository extends JpaRepository<BusinessObligationMatrixVersion, Long> {
    List<BusinessObligationMatrixVersion> findByBusinessObligationMatrix_IdOrderByVersionAsc(Long matrixId);
}
