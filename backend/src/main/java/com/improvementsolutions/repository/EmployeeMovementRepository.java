package com.improvementsolutions.repository;

import com.improvementsolutions.model.EmployeeMovement;
import com.improvementsolutions.model.BusinessEmployee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeMovementRepository extends JpaRepository<EmployeeMovement, Long> {
    List<EmployeeMovement> findByBusinessEmployeeOrderByEffectiveDateDescIdDesc(BusinessEmployee businessEmployee);
}
