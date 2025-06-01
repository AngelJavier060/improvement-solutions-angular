package com.improvementsolutions.repository;

import com.improvementsolutions.model.ObligationMatrix;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ObligationMatrixRepository extends JpaRepository<ObligationMatrix, Long> {
}
