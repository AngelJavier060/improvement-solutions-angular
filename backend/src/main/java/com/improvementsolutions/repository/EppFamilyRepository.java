package com.improvementsolutions.repository;

import com.improvementsolutions.model.EppFamily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EppFamilyRepository extends JpaRepository<EppFamily, Long> {

    List<EppFamily> findAllByOrderByNameAsc();

    @Query("SELECT f FROM EppFamily f WHERE LOWER(TRIM(f.name)) = LOWER(TRIM(:name))")
    Optional<EppFamily> findByNameIgnoreCase(@Param("name") String name);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM EppFamily f " +
           "WHERE LOWER(TRIM(f.name)) = LOWER(TRIM(:name)) AND (:id IS NULL OR f.id <> :id)")
    boolean existsByNameIgnoreCaseExcludingId(@Param("name") String name, @Param("id") Long id);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END FROM EppFamily f " +
           "WHERE UPPER(TRIM(f.code)) = UPPER(TRIM(:code)) AND (:id IS NULL OR f.id <> :id)")
    boolean existsByCodeIgnoreCaseExcludingId(@Param("code") String code, @Param("id") Long id);
}
