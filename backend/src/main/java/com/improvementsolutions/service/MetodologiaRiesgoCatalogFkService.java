package com.improvementsolutions.service;

import com.improvementsolutions.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Antes de reemplazar parámetros/niveles de una metodología, anula referencias en catálogos de viaje
 * que apuntan a {@code NivelParametro} (evita error 500 por restricciones de integridad).
 */
@Service
public class MetodologiaRiesgoCatalogFkService {

    private final DistanciaRecorrerRepository distanciaRecorrerRepository;
    private final TipoViaRepository tipoViaRepository;
    private final CondicionClimaticaRepository condicionClimaticaRepository;
    private final HorarioCirculacionRepository horarioCirculacionRepository;
    private final EstadoCarreteraRepository estadoCarreteraRepository;
    private final TipoCargaRepository tipoCargaRepository;
    private final HoraConduccionRepository horaConduccionRepository;
    private final HoraDescansoRepository horaDescansoRepository;
    private final MedioComunicacionRepository medioComunicacionRepository;
    private final TransportaPasajeroRepository transportaPasajeroRepository;

    @Autowired
    public MetodologiaRiesgoCatalogFkService(
            DistanciaRecorrerRepository distanciaRecorrerRepository,
            TipoViaRepository tipoViaRepository,
            CondicionClimaticaRepository condicionClimaticaRepository,
            HorarioCirculacionRepository horarioCirculacionRepository,
            EstadoCarreteraRepository estadoCarreteraRepository,
            TipoCargaRepository tipoCargaRepository,
            HoraConduccionRepository horaConduccionRepository,
            HoraDescansoRepository horaDescansoRepository,
            MedioComunicacionRepository medioComunicacionRepository,
            TransportaPasajeroRepository transportaPasajeroRepository) {
        this.distanciaRecorrerRepository = distanciaRecorrerRepository;
        this.tipoViaRepository = tipoViaRepository;
        this.condicionClimaticaRepository = condicionClimaticaRepository;
        this.horarioCirculacionRepository = horarioCirculacionRepository;
        this.estadoCarreteraRepository = estadoCarreteraRepository;
        this.tipoCargaRepository = tipoCargaRepository;
        this.horaConduccionRepository = horaConduccionRepository;
        this.horaDescansoRepository = horaDescansoRepository;
        this.medioComunicacionRepository = medioComunicacionRepository;
        this.transportaPasajeroRepository = transportaPasajeroRepository;
    }

    @Transactional
    public void clearCatalogNivelLinks(Long metodologiaId) {
        if (metodologiaId == null) {
            return;
        }
        distanciaRecorrerRepository.clearNivelesByMetodologiaId(metodologiaId);
        tipoViaRepository.clearNivelesByMetodologiaId(metodologiaId);
        condicionClimaticaRepository.clearNivelesByMetodologiaId(metodologiaId);
        horarioCirculacionRepository.clearNivelesByMetodologiaId(metodologiaId);
        estadoCarreteraRepository.clearNivelesByMetodologiaId(metodologiaId);
        tipoCargaRepository.clearNivelesByMetodologiaId(metodologiaId);
        horaConduccionRepository.clearNivelesByMetodologiaId(metodologiaId);
        horaDescansoRepository.clearNivelesByMetodologiaId(metodologiaId);
        medioComunicacionRepository.clearNivelesByMetodologiaId(metodologiaId);
        transportaPasajeroRepository.clearNivelesByMetodologiaId(metodologiaId);
    }
}
