package com.improvementsolutions.repository;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessRepository extends JpaRepository<Business, Long> {
    
    Optional<Business> findByRuc(String ruc);
    
    List<Business> findByNameContainingIgnoreCase(String name);
    
    Boolean existsByRuc(String ruc);
    
    @Query("SELECT b FROM Business b JOIN b.users u WHERE u.id = :userId")
    List<Business> findBusinessesByUserId(Long userId);
    
    // Empresas creadas por un usuario específico (columna created_by)
    List<Business> findByCreatedBy(User createdBy);
    
    List<Business> findByActiveTrue();
    
    Long countByActiveTrue();
    
    @Query("SELECT b FROM Business b WHERE LOWER(b.name) LIKE LOWER(CONCAT('%', :term, '%')) OR LOWER(b.ruc) LIKE LOWER(CONCAT('%', :term, '%'))")
    List<Business> findByNameContainingIgnoreCaseOrRucContainingIgnoreCase(@Param("term") String name, @Param("term") String ruc);
    
    @Query("SELECT b FROM Business b WHERE b.registrationDate >= :startDate AND b.registrationDate <= :endDate")
    List<Business> findByRegistrationDateBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT b FROM Business b WHERE b.id = :id")
    Optional<Business> findByIdWithAllRelations(@Param("id") Long id);
    
    @Query("SELECT DISTINCT b FROM Business b " +
           "LEFT JOIN FETCH b.contractorCompanies " +
           "WHERE b.id = :id")
    Optional<Business> findByIdWithContractorCompanies(@Param("id") Long id);

    @Query("SELECT b FROM Business b JOIN b.positions p WHERE p.id = :positionId")
    List<Business> findByPositionId(@Param("positionId") Long positionId);

    // Eagerly fetch contractor blocks and their contractor company (separate query to avoid MultipleBagFetchException)
    @Query("SELECT DISTINCT b FROM Business b " +
           "LEFT JOIN FETCH b.contractorBlocks cb " +
           "LEFT JOIN FETCH cb.contractorCompany " +
           "WHERE b.id = :id")
    Optional<Business> findByIdWithContractorBlocksAndCompany(@Param("id") Long id);
}
