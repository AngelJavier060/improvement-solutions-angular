package com.improvementsolutions.repository;

import com.improvementsolutions.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

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

    /**
     * Obtiene todos los usuarios con sus roles utilizando JOIN FETCH para evitar LazyInitializationException
     */
    @Query("select distinct u from User u left join fetch u.roles")
    List<User> findAllWithRoles();

    // Limpieza explícita de filas en tablas de unión antes de eliminar usuario
    @Modifying
    @Query(value = "DELETE FROM user_roles WHERE user_id = :userId", nativeQuery = true)
    void deleteFromUserRoles(@Param("userId") Long userId);

    // Legacy join table in some schemas
    @Modifying
    @Query(value = "DELETE FROM user_role WHERE user_id = :userId", nativeQuery = true)
    void deleteFromUserRoleLegacy(@Param("userId") Long userId);

    // Conteo de usuarios activos por nombre de rol
    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE u.active = true AND r.name = :roleName")
    long countActiveUsersByRoleName(@Param("roleName") String roleName);
}
