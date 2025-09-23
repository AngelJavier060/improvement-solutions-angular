package com.improvementsolutions.repository;

import com.improvementsolutions.model.CourseCertification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CourseCertificationRepository extends JpaRepository<CourseCertification, Long> {
    Optional<CourseCertification> findByName(String name);
}
