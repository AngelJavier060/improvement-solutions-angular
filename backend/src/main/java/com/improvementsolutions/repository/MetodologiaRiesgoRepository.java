package com.improvementsolutions.repository;

import com.improvementsolutions.model.MetodologiaRiesgo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MetodologiaRiesgoRepository extends JpaRepository<MetodologiaRiesgo, Long> {
    Optional<MetodologiaRiesgo> findByName(String name);

    @Query("select distinct m from MetodologiaRiesgo m left join fetch m.parametros p left join fetch p.niveles order by m.id")
    List<MetodologiaRiesgo> findAllWithParametrosAndNiveles();

    @Query("select distinct m from MetodologiaRiesgo m left join fetch m.parametros p left join fetch p.niveles where m.id = :id")
    Optional<MetodologiaRiesgo> findByIdWithParametrosAndNiveles(@Param("id") Long id);
}
