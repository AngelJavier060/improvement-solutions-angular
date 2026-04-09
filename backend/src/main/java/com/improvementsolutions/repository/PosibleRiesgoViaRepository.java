package com.improvementsolutions.repository;

import com.improvementsolutions.model.PosibleRiesgoVia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PosibleRiesgoViaRepository extends JpaRepository<PosibleRiesgoVia, Long> {
}
