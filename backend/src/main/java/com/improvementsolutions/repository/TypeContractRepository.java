package com.improvementsolutions.repository;

import com.improvementsolutions.model.TypeContract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TypeContractRepository extends JpaRepository<TypeContract, Long> {
    
    Optional<TypeContract> findByName(String name);
    
    @Query("SELECT tc FROM TypeContract tc JOIN tc.businesses b WHERE b.id = :businessId")
    List<TypeContract> findByBusinessId(Long businessId);
}