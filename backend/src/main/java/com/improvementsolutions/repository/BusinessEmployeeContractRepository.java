package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessEmployeeContractRepository extends JpaRepository<BusinessEmployeeContract, Long> {

    List<BusinessEmployeeContract> findByBusinessEmployeeId(Long businessEmployeeId);

    @Query("SELECT c FROM BusinessEmployeeContract c WHERE c.businessEmployee.cedula = :cedula")
    List<BusinessEmployeeContract> findByEmployeeCedula(String cedula);

    // Para desasociar contratos de un cargo específico antes de eliminar el cargo
    List<BusinessEmployeeContract> findByPositionId(Long positionId);
}
