package com.improvementsolutions.repository;

import com.improvementsolutions.model.Transmision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransmisionRepository extends JpaRepository<Transmision, Long> {
    Optional<Transmision> findByName(String name);
}
