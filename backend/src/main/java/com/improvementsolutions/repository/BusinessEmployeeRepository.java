package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessEmployeeRepository extends JpaRepository<BusinessEmployee, Long> {
    
    List<BusinessEmployee> findByBusinessId(Long businessId);

    @EntityGraph(attributePaths = {
        "business", "gender", "civilStatus", "etnia", "degree",
        "positionEntity", "department", "typeContract",
        "contractorCompany", "contractorBlock",
        "workSchedule", "workShift"
    })
    List<BusinessEmployee> findWithRelationsByBusinessId(Long businessId);
    
    @EntityGraph(attributePaths = {
        "business", "gender", "civilStatus", "etnia", "degree",
        "positionEntity", "department", "typeContract",
        "contractorCompany", "contractorBlock",
        "workSchedule", "workShift"
    })
    @Query("SELECT e FROM BusinessEmployee e WHERE e.id = :id")
    Optional<BusinessEmployee> findDetailedById(@Param("id") Long id);

    Optional<BusinessEmployee> findByBusinessIdAndEmployeeId(Long businessId, Long employeeId);
    
    List<BusinessEmployee> findByBusinessIdAndStatus(Long businessId, String status);
    
    Optional<BusinessEmployee> findByBusinessIdAndCedula(Long businessId, String cedula);
    
    Boolean existsByBusinessIdAndCedula(Long businessId, String cedula);
    
    Boolean existsByBusinessIdAndCodigoEmpresa(Long businessId, String codigoEmpresa);

    Boolean existsByBusinessIdAndNombresIgnoreCaseAndApellidosIgnoreCase(Long businessId, String nombres, String apellidos);
    
    // Buscar por usuario vinculado (login de empleado) — puede haber varios registros (multi-empresa)
    Optional<BusinessEmployee> findByUserId(Long userId);

    List<BusinessEmployee> findAllByUserId(Long userId);

    // Buscar por cédula sin limitar a una empresa específica
    List<BusinessEmployee> findByCedula(String cedula);

    @Query("SELECT be FROM BusinessEmployee be WHERE be.business.id = :businessId AND " +
           "(LOWER(be.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(be.cedula) LIKE LOWER(CONCAT('%', :searchTerm, '%')))"
    )
    List<BusinessEmployee> searchByBusinessIdAndNameOrCedula(@Param("businessId") Long businessId,
                                                           @Param("searchTerm") String searchTerm);
  
    @Query("SELECT be FROM BusinessEmployee be LEFT JOIN FETCH be.gender WHERE be.business.id = :businessId")
    List<BusinessEmployee> findByBusinessIdWithGender(@Param("businessId") Long businessId);

    // Para datos legados: considerar empleados que no tengan seteada la relación 'business'
    // y usen el campo codigoEmpresa (RUC) o cuando el RUC coincide con el de la empresa
    @Query("SELECT DISTINCT be FROM BusinessEmployee be " +
           "LEFT JOIN FETCH be.gender g " +
           "LEFT JOIN be.business b " +
           "WHERE (b.id = :businessId) " +
           "   OR (LOWER(TRIM(be.codigoEmpresa)) = LOWER(TRIM(:ruc))) " +
           "   OR (b.ruc IS NOT NULL AND LOWER(TRIM(b.ruc)) = LOWER(TRIM(:ruc)))")
    List<BusinessEmployee> findByBusinessOrRucOrCodigo(@Param("businessId") Long businessId,
                                                       @Param("ruc") String ruc);

    @Query(value = "SELECT be FROM BusinessEmployee be WHERE be.business.id = :businessId " +
            "AND (:cedula IS NULL OR LOWER(be.cedula) LIKE LOWER(CONCAT('%', :cedula, '%'))) " +
            "AND (:nombres IS NULL OR LOWER(be.nombres) LIKE LOWER(CONCAT('%', :nombres, '%'))) " +
            "AND (:apellidos IS NULL OR LOWER(be.apellidos) LIKE LOWER(CONCAT('%', :apellidos, '%'))) " +
            "AND (:codigo IS NULL OR LOWER(be.codigoEmpresa) LIKE LOWER(CONCAT('%', :codigo, '%')))",
            countQuery = "SELECT COUNT(be) FROM BusinessEmployee be WHERE be.business.id = :businessId " +
                    "AND (:cedula IS NULL OR LOWER(be.cedula) LIKE LOWER(CONCAT('%', :cedula, '%'))) " +
                    "AND (:nombres IS NULL OR LOWER(be.nombres) LIKE LOWER(CONCAT('%', :nombres, '%'))) " +
                    "AND (:apellidos IS NULL OR LOWER(be.apellidos) LIKE LOWER(CONCAT('%', :apellidos, '%'))) " +
                    "AND (:codigo IS NULL OR LOWER(be.codigoEmpresa) LIKE LOWER(CONCAT('%', :codigo, '%')))"
    )
    Page<BusinessEmployee> searchByFilters(@Param("businessId") Long businessId,
                                           @Param("cedula") String cedula,
                                           @Param("nombres") String nombres,
                                           @Param("apellidos") String apellidos,
                                           @Param("codigo") String codigo,
                                           Pageable pageable);

    // Para desasociar empleados del cargo antes de eliminarlo definitivamente
    List<BusinessEmployee> findByPositionEntityId(Long positionId);

    @Query(value = "SELECT * FROM business_employees e " +
            "WHERE e.business_id = :businessId " +
            "AND COALESCE(e.active, TRUE) = TRUE " +
            "AND (e.status IS NULL OR UPPER(e.status) <> 'INACTIVO') " +
            "AND e.date_birth IS NOT NULL " +
            "AND EXTRACT(MONTH FROM e.date_birth) = :month " +
            "AND EXTRACT(DAY FROM e.date_birth) = :day " +
            "ORDER BY e.nombres, e.apellidos",
            nativeQuery = true)
    List<BusinessEmployee> findActiveBirthdaysOnDay(
            @Param("businessId") Long businessId,
            @Param("month") int month,
            @Param("day") int day);

    @Query("SELECT e FROM BusinessEmployee e WHERE e.business.id = :businessId " +
            "AND (e.active = true OR e.active IS NULL) " +
            "AND (e.status IS NULL OR UPPER(e.status) <> 'INACTIVO') " +
            "AND e.dateBirth IS NOT NULL")
    List<BusinessEmployee> findActiveWithBirthDate(@Param("businessId") Long businessId);
}

