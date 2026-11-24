package com.improvementsolutions.repository;

import com.improvementsolutions.model.BloodType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BloodTypeRepository extends JpaRepository<BloodType, Long> {

    Optional<BloodType> findByName(String name);

    @Query("SELECT DISTINCT bt FROM BloodType bt JOIN bt.businesses b WHERE b.id = :businessId")
    List<BloodType> findByBusinessId(Long businessId);
}
