package com.improvementsolutions.repository;

import com.improvementsolutions.model.MonthlySheetClosure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MonthlySheetClosureRepository extends JpaRepository<MonthlySheetClosure, Long> {

    List<MonthlySheetClosure> findByBusiness_IdOrderByYearDescMonthDesc(Long businessId);

    Optional<MonthlySheetClosure> findByBusiness_IdAndYearAndMonth(Long businessId, Integer year, Integer month);
}
