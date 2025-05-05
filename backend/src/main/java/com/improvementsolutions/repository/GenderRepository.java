package com.improvementsolutions.repository;

import com.improvementsolutions.model.Gender;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GenderRepository extends JpaRepository<Gender, Long> {
    // Métodos personalizados si son necesarios
}