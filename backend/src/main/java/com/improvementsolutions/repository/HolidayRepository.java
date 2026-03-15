package com.improvementsolutions.repository;

import com.improvementsolutions.model.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    @Query("SELECT h FROM Holiday h WHERE h.business IS NULL AND h.active = true AND h.date BETWEEN :from AND :to")
    List<Holiday> findNationalBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT h FROM Holiday h WHERE h.business.id = :businessId AND h.active = true AND h.date BETWEEN :from AND :to")
    List<Holiday> findByBusinessBetween(@Param("businessId") Long businessId,
                                        @Param("from") LocalDate from,
                                        @Param("to") LocalDate to);
}
