package com.improvementsolutions.repository;

import com.improvementsolutions.model.BusinessTipoVehiculoDocumento;
import com.improvementsolutions.model.EntidadRemitente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessTipoVehiculoDocumentoRepository extends JpaRepository<BusinessTipoVehiculoDocumento, Long> {

    @Query("SELECT r.entidadRemitente FROM BusinessTipoVehiculoDocumento r " +
           "WHERE r.business.id = :businessId AND r.tipoVehiculo.id = :tipoVehiculoId " +
           "ORDER BY r.entidadRemitente.name ASC")
    List<EntidadRemitente> findEntidadRemitentesByBusinessAndTipo(
            @Param("businessId") Long businessId,
            @Param("tipoVehiculoId") Long tipoVehiculoId);

    @Query("SELECT r.entidadRemitente.id FROM BusinessTipoVehiculoDocumento r " +
           "WHERE r.business.id = :businessId AND r.tipoVehiculo.id = :tipoVehiculoId")
    List<Long> findEntidadRemitenteIdsByBusinessAndTipo(
            @Param("businessId") Long businessId,
            @Param("tipoVehiculoId") Long tipoVehiculoId);

    long countByBusiness_IdAndTipoVehiculo_Id(Long businessId, Long tipoVehiculoId);

    boolean existsByBusiness_IdAndTipoVehiculo_IdAndEntidadRemitente_Id(
            Long businessId, Long tipoVehiculoId, Long entidadRemitenteId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM BusinessTipoVehiculoDocumento r WHERE r.business.id = :businessId AND r.tipoVehiculo.id = :tipoVehiculoId")
    void deleteByBusinessAndTipo(@Param("businessId") Long businessId, @Param("tipoVehiculoId") Long tipoVehiculoId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM BusinessTipoVehiculoDocumento r WHERE r.business.id = :businessId AND r.entidadRemitente.id = :entidadRemitenteId")
    void deleteByBusinessAndEntidadRemitente(
            @Param("businessId") Long businessId,
            @Param("entidadRemitenteId") Long entidadRemitenteId);
}
