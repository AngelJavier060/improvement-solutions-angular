package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessEmployeeCardRepository extends JpaRepository<BusinessEmployeeCard, Long> {
    List<BusinessEmployeeCard> findByBusinessEmployeeId(Long businessEmployeeId);

    @Query("SELECT c FROM BusinessEmployeeCard c WHERE c.businessEmployee.cedula = :cedula")
    List<BusinessEmployeeCard> findByEmployeeCedula(String cedula);

    List<BusinessEmployeeCard> findByBusinessEmployeeIdAndCardIdAndActiveTrue(Long businessEmployeeId, Long cardId);
}
