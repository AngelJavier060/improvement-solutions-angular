package com.improvementsolutions.repository;

import com.improvementsolutions.model.Degree;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DegreeRepository extends JpaRepository<Degree, Long> {
    
    Optional<Degree> findByName(String name);
}