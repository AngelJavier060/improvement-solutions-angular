package com.improvementsolutions.repository;

import com.improvementsolutions.model.Etnia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EthniaRepository extends JpaRepository<Etnia, Long> {
}
