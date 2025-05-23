package com.improvementsolutions.repository;

import com.improvementsolutions.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repositorio para la entidad User
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    /**
     * Buscar un usuario por su nombre de usuario
     */
    Optional<User> findByUsername(String username);
    
    /**
     * Buscar un usuario por su correo electrónico
     */
    Optional<User> findByEmail(String email);
    
    /**
     * Verificar si existe un usuario con el nombre de usuario especificado
     */
    Boolean existsByUsername(String username);
    
    /**
     * Verificar si existe un usuario con el correo electrónico especificado
     */
    Boolean existsByEmail(String email);
}
