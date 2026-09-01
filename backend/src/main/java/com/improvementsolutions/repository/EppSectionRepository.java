package com.improvementsolutions.repository;

import com.improvementsolutions.model.EppSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EppSectionRepository extends JpaRepository<EppSection, Long> {

    List<EppSection> findAllByOrderByNameAsc();

    @Query("SELECT s FROM EppSection s WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(:name))")
    Optional<EppSection> findByNameIgnoreCase(@Param("name") String name);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM EppSection s " +
           "WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(:name)) AND (:id IS NULL OR s.id <> :id)")
    boolean existsByNameIgnoreCaseExcludingId(@Param("name") String name, @Param("id") Long id);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM EppSection s " +
           "WHERE UPPER(TRIM(s.code)) = UPPER(TRIM(:code)) AND (:id IS NULL OR s.id <> :id)")
    boolean existsByCodeIgnoreCaseExcludingId(@Param("code") String code, @Param("id") Long id);
}
