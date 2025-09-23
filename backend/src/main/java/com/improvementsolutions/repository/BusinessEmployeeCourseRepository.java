package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployeeCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessEmployeeCourseRepository extends JpaRepository<BusinessEmployeeCourse, Long> {
    List<BusinessEmployeeCourse> findByBusinessEmployeeId(Long businessEmployeeId);

    @Query("SELECT c FROM BusinessEmployeeCourse c WHERE c.businessEmployee.cedula = :cedula")
    List<BusinessEmployeeCourse> findByEmployeeCedula(String cedula);

    List<BusinessEmployeeCourse> findByBusinessEmployeeIdAndCourseCertificationIdAndActiveTrue(Long businessEmployeeId, Long courseCertificationId);
}
