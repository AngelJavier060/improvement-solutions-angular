package com.improvementsolutions.repository;

import com.improvementsolutions.model.Iess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IessRepository extends JpaRepository<Iess, Long> {
    
    Optional<Iess> findByName(String name);
    
    @Query("SELECT i FROM Iess i JOIN i.businesses b WHERE b.id = :businessId")
    List<Iess> findByBusinessId(Long businessId);
}