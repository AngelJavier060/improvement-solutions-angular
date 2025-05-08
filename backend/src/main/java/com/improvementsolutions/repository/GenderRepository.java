package com.improvementsolutions.repository;

import com.improvementsolutions.model.Gender;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface GenderRepository extends JpaRepository<Gender, Long> {
    Optional<Gender> findByName(String name);

    // Métodos personalizados si son necesarios
}