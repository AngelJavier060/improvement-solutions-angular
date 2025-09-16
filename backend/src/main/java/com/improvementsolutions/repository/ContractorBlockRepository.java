package com.improvementsolutions.repository;

import com.improvementsolutions.model.ContractorBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractorBlockRepository extends JpaRepository<ContractorBlock, Long> {
    
    /**
     * Buscar bloques por empresa contratista
     */
    @Query("SELECT cb FROM ContractorBlock cb WHERE cb.contractorCompany.id = :companyId ORDER BY cb.name")
    List<ContractorBlock> findByContractorCompanyId(@Param("companyId") Long companyId);
    
    /**
     * Buscar bloques activos por empresa contratista
     */
    @Query("SELECT cb FROM ContractorBlock cb WHERE cb.contractorCompany.id = :companyId AND cb.active = true ORDER BY cb.name")
    List<ContractorBlock> findActiveByContractorCompanyId(@Param("companyId") Long companyId);
    
    /**
     * Buscar bloque por nombre y empresa contratista
     */
    @Query("SELECT cb FROM ContractorBlock cb WHERE cb.name = :name AND cb.contractorCompany.id = :companyId")
    Optional<ContractorBlock> findByNameAndContractorCompanyId(@Param("name") String name, @Param("companyId") Long companyId);
    
    /**
     * Buscar bloque por código
     */
    Optional<ContractorBlock> findByCode(String code);
    
    /**
     * Buscar todos los bloques activos
     */
    @Query("SELECT cb FROM ContractorBlock cb WHERE cb.active = true ORDER BY cb.contractorCompany.name, cb.name")
    List<ContractorBlock> findAllActive();
    
    /**
     * Contar empleados por bloque
     */
    @Query("SELECT COUNT(be) FROM BusinessEmployee be WHERE be.contractorBlock.id = :blockId")
    Long countEmployeesByBlockId(@Param("blockId") Long blockId);
    
    /**
     * Buscar bloques por nombre (contiene el texto)
     */
    @Query("SELECT cb FROM ContractorBlock cb WHERE LOWER(cb.name) LIKE LOWER(CONCAT('%', :name, '%')) ORDER BY cb.name")
    List<ContractorBlock> findByNameContainingIgnoreCase(@Param("name") String name);
}