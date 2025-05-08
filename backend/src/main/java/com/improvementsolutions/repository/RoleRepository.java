package com.improvementsolutions.repository;

import com.improvementsolutions.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio para la entidad Role
 */
@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    
    /**
     * Buscar un rol por su nombre
     */
    Optional<Role> findByName(String name);
    
    /**
     * Verificar si existe un rol con el nombre especificado
     */
    boolean existsByName(String name);
}