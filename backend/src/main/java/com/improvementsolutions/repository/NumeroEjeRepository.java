package com.improvementsolutions.repository;

import com.improvementsolutions.model.NumeroEje;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NumeroEjeRepository extends JpaRepository<NumeroEje, Long> {
}
