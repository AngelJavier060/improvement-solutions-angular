package com.improvementsolutions.repository;

import com.improvementsolutions.model.CivilStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CivilStatusRepository extends JpaRepository<CivilStatus, Long> {
    
    Optional<CivilStatus> findByName(String name);
}
