package com.improvementsolutions.repository;

import com.improvementsolutions.model.NivelParametro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NivelParametroRepository extends JpaRepository<NivelParametro, Long> {
    List<NivelParametro> findByParametroMetodologiaIdOrderByValorAsc(Long parametroMetodologiaId);
}
