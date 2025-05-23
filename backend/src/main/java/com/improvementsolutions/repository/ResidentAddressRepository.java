package com.improvementsolutions.repository;

import com.improvementsolutions.model.ResidentAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResidentAddressRepository extends JpaRepository<ResidentAddress, Long> {
    
    Optional<ResidentAddress> findByName(String name);
}
