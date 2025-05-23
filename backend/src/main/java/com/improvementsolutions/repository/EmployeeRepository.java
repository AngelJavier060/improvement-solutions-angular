package com.improvementsolutions.repository;

import com.improvementsolutions.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    
    Optional<Employee> findByCedula(String cedula);
    
    Boolean existsByCedula(String cedula);
}
