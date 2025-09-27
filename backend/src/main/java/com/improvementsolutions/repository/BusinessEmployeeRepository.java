package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessEmployee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessEmployeeRepository extends JpaRepository<BusinessEmployee, Long> {
    
    List<BusinessEmployee> findByBusinessId(Long businessId);
    
    Optional<BusinessEmployee> findByBusinessIdAndEmployeeId(Long businessId, Long employeeId);
    
    List<BusinessEmployee> findByBusinessIdAndStatus(Long businessId, String status);
    
    Optional<BusinessEmployee> findByBusinessIdAndCedula(Long businessId, String cedula);
    
    Boolean existsByBusinessIdAndCedula(Long businessId, String cedula);
    
    // Buscar por cédula sin limitar a una empresa específica
    List<BusinessEmployee> findByCedula(String cedula);

    @Query("SELECT be FROM BusinessEmployee be WHERE be.business.id = :businessId AND " +
           "(LOWER(be.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(be.cedula) LIKE LOWER(CONCAT('%', :searchTerm, '%')))"
    )
    List<BusinessEmployee> searchByBusinessIdAndNameOrCedula(Long businessId, String searchTerm);
  
    @Query("SELECT be FROM BusinessEmployee be LEFT JOIN FETCH be.gender WHERE be.business.id = :businessId")
    List<BusinessEmployee> findByBusinessIdWithGender(Long businessId);

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
    Page<BusinessEmployee> searchByFilters(Long businessId,
                                           String cedula,
                                           String nombres,
                                           String apellidos,
                                           String codigo,
                                           Pageable pageable);

    // Para desasociar empleados del cargo antes de eliminarlo definitivamente
    List<BusinessEmployee> findByPositionEntityId(Long positionId);
}

