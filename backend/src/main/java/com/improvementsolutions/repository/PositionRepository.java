package com.improvementsolutions.repository;

import com.improvementsolutions.model.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {
    
    Optional<Position> findByName(String name);
    
    @Query("SELECT p FROM Position p JOIN p.businesses b WHERE b.id = :businessId")
    List<Position> findByBusinessId(Long businessId);
}