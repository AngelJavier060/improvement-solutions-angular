package com.improvementsolutions.repository;

import com.improvementsolutions.model.ContractorCompany;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractorCompanyRepository extends JpaRepository<ContractorCompany, Long> {
    
    /**
     * Buscar empresa contratista por nombre
     */
    Optional<ContractorCompany> findByName(String name);
    
    /**
     * Buscar empresa contratista por código
     */
    Optional<ContractorCompany> findByCode(String code);
    
    /**
     * Buscar empresas contratistas activas
     */
    @Query("SELECT cc FROM ContractorCompany cc WHERE cc.active = true ORDER BY cc.name")
    List<ContractorCompany> findAllActive();
    
    /**
     * Buscar empresa contratista por nombre ignorando mayúsculas/minúsculas
     */
    @Query("SELECT cc FROM ContractorCompany cc WHERE LOWER(cc.name) LIKE LOWER(CONCAT('%', :name, '%'))")
    List<ContractorCompany> findByNameContainingIgnoreCase(@Param("name") String name);
    
    /**
     * Contar empleados por empresa contratista
     */
    @Query("SELECT COUNT(be) FROM BusinessEmployee be WHERE be.contractorCompany.id = :companyId")
    Long countEmployeesByCompanyId(@Param("companyId") Long companyId);
}