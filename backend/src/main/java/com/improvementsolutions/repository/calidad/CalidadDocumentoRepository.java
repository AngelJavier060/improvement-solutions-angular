package com.improvementsolutions.repository.calidad;

import com.improvementsolutions.model.calidad.CalidadDocumento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CalidadDocumentoRepository extends JpaRepository<CalidadDocumento, Long> {

    List<CalidadDocumento> findByBusiness_IdOrderByCodigoAsc(Long businessId);

    Optional<CalidadDocumento> findByIdAndBusiness_Id(Long id, Long businessId);

    boolean existsByBusiness_IdAndCodigo(Long businessId, String codigo);

    long countByParentId(Long parentId);

    @Query("""
        SELECT d.codigo FROM CalidadDocumento d
        WHERE d.business.id = :businessId
          AND d.codigo LIKE :prefixPattern
        """)
    List<String> findCodigosByBusinessAndPrefix(
            @Param("businessId") Long businessId,
            @Param("prefixPattern") String prefixPattern
    );
}
