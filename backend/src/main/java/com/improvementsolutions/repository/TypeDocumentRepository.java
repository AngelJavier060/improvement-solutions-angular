package com.improvementsolutions.repository;

import com.improvementsolutions.model.TypeDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TypeDocumentRepository extends JpaRepository<TypeDocument, Long> {
    
    Optional<TypeDocument> findByName(String name);
    
    @Query("SELECT td FROM TypeDocument td JOIN td.businesses b WHERE b.id = :businessId")
    List<TypeDocument> findByBusinessId(Long businessId);
}
