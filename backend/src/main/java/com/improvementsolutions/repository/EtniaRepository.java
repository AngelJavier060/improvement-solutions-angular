package com.improvementsolutions.repository;

import com.improvementsolutions.model.Etnia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EtniaRepository extends JpaRepository<Etnia, Long> {
    
    Optional<Etnia> findByName(String name);
}
