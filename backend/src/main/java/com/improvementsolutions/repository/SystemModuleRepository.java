package com.improvementsolutions.repository;

import com.improvementsolutions.model.SystemModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemModuleRepository extends JpaRepository<SystemModule, Long> {
    Optional<SystemModule> findByCode(String code);
    List<SystemModule> findByActiveTrueOrderByDisplayOrderAsc();
    List<SystemModule> findAllByOrderByDisplayOrderAsc();
}
