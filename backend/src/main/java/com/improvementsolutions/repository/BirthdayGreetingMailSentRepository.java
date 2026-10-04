package com.improvementsolutions.repository;

import com.improvementsolutions.model.BirthdayGreetingMailSent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BirthdayGreetingMailSentRepository extends JpaRepository<BirthdayGreetingMailSent, Long> {

    boolean existsByEmployeeIdAndSentDateAndSlot(Long employeeId, LocalDate sentDate, Integer slot);

    int countByEmployeeIdAndSentDateAndSlotNot(Long employeeId, LocalDate sentDate, Integer slot);

    List<BirthdayGreetingMailSent> findByBusinessIdAndSentDate(Long businessId, LocalDate sentDate);
}
