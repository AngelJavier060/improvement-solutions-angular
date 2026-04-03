package com.improvementsolutions.repository;

import com.improvementsolutions.model.HoraDescanso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HoraDescansoRepository extends JpaRepository<HoraDescanso, Long> {
    Optional<HoraDescanso> findByName(String name);
}
