package com.improvementsolutions.repository;

import com.improvementsolutions.model.Business;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessRepository extends JpaRepository<Business, Long> {
    
    Optional<Business> findByRuc(String ruc);
    
    List<Business> findByNameContainingIgnoreCase(String name);
    
    Boolean existsByRuc(String ruc);
    
    @Query("SELECT b FROM Business b JOIN b.users u WHERE u.id = :userId")
    List<Business> findBusinessesByUserId(Long userId);
}