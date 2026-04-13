package com.improvementsolutions.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Elimina filas en tablas {@code business_*} antes de borrar catálogos de viaje,
 * para evitar violaciones de FK en los {@code @JoinTable} de {@code Business}.
 */
@Service
public class BusinessViajeCatalogJoinCleanupService {

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional
    public void unlinkDistanciaRecorrer(Long id) {
        entityManager.createNativeQuery(
                        "DELETE FROM business_distancia_recorrer WHERE distancia_recorrer_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkTipoVia(Long id) {
        entityManager.createNativeQuery("DELETE FROM business_tipo_via WHERE tipo_via_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkCondicionClimatica(Long id) {
        entityManager.createNativeQuery(
                        "DELETE FROM business_condicion_climatica WHERE condicion_climatica_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkHorarioCirculacion(Long id) {
        entityManager.createNativeQuery(
                        "DELETE FROM business_horario_circulacion WHERE horario_circulacion_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkEstadoCarretera(Long id) {
        entityManager.createNativeQuery(
                        "DELETE FROM business_estado_carretera WHERE estado_carretera_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkTipoCarga(Long id) {
        entityManager.createNativeQuery("DELETE FROM business_tipo_carga WHERE tipo_carga_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkHoraConduccion(Long id) {
        entityManager.createNativeQuery(
                        "DELETE FROM business_hora_conduccion WHERE hora_conduccion_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkHoraDescanso(Long id) {
        entityManager.createNativeQuery("DELETE FROM business_hora_descanso WHERE hora_descanso_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkMedioComunicacion(Long id) {
        entityManager.createNativeQuery(
                        "DELETE FROM business_medio_comunicacion WHERE medio_comunicacion_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkTransportaPasajero(Long id) {
        entityManager.createNativeQuery(
                        "DELETE FROM business_transporta_pasajero WHERE transporta_pasajero_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkPosibleRiesgoVia(Long id) {
        entityManager.createNativeQuery(
                        "DELETE FROM business_posible_riesgo_via WHERE posible_riesgo_via_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkOtrosPeligrosViaje(Long id) {
        entityManager.createNativeQuery(
                        "DELETE FROM business_otros_peligros_viaje WHERE otros_peligros_viaje_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }

    @Transactional
    public void unlinkMedidaControlTomadaViaje(Long id) {
        entityManager.createNativeQuery(
                        "DELETE FROM business_medida_control_tomada_viaje WHERE medida_control_tomada_viaje_id = :id")
                .setParameter("id", id)
                .executeUpdate();
    }
}
