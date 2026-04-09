package com.improvementsolutions.service;

import com.improvementsolutions.dto.GerenciaViajeCierreRequest;
import com.improvementsolutions.dto.GerenciaViajeDto;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.GerenciaViaje;
import com.improvementsolutions.model.MetodologiaRiesgo;
import com.improvementsolutions.model.NivelParametro;
import com.improvementsolutions.model.ParametroMetodologia;
import com.improvementsolutions.repository.GerenciaViajeRepository;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.MetodologiaRiesgoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GerenciaViajeService {

    private final GerenciaViajeRepository gerenciaRepository;
    private final BusinessRepository businessRepository;
    private final MetodologiaRiesgoRepository metodologiaRiesgoRepository;

    // ── Listar por RUC ───────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<GerenciaViajeDto> findByRuc(String ruc) {
        return gerenciaRepository
                .findByBusiness_RucOrderByFechaHoraDesc(ruc)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Listar por RUC y estado ──────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<GerenciaViajeDto> findByRucAndEstado(String ruc, String estado) {
        return gerenciaRepository
                .findByBusiness_RucAndEstadoOrderByFechaHoraDesc(ruc, estado)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Listar por RUC y cédula conductor ────────────────────────────────
    @Transactional(readOnly = true)
    public List<GerenciaViajeDto> findByRucAndCedula(String ruc, String cedula) {
        return gerenciaRepository
                .findByBusiness_RucAndCedulaOrderByFechaHoraDesc(ruc, cedula)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Obtener uno por id ───────────────────────────────────────────────
    @Transactional(readOnly = true)
    public GerenciaViajeDto findById(Long id) {
        GerenciaViaje gv = gerenciaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Gerencia de viaje no encontrada con id: " + id));
        GerenciaViajeDto dto = toDto(gv);
        try {
            if (gv.getBusiness() != null) {
                enrichRiskScores(dto, gv.getBusiness().getId());
            }
        } catch (Exception ex) {
            log.debug("[GerenciaViaje] Puntajes no calculados para id={}: {}", id, ex.getMessage());
        }
        return dto;
    }

    // ── Crear ────────────────────────────────────────────────────────────
    @Transactional
    public GerenciaViajeDto create(String ruc, GerenciaViajeDto dto) {
        Business business = businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Empresa no encontrada con RUC: " + ruc));

        assertNoOpenGerenciaForConductor(business.getId(), dto.getCedula());
        assertKmInicialValid(business.getId(), dto.getVehiculoInicio(), dto.getKmInicial(), null);

        GerenciaViaje gv = fromDto(dto, business);
        if (gv.getFechaHora() == null) {
            gv.setFechaHora(LocalDateTime.now());
        }
        gv.setCodigo(generateNextCodigo(business));
        gv.setEstado("ACTIVO");
        gv.setKmFinal(null);
        gv.setFechaCierre(null);
        gv = gerenciaRepository.save(gv);
        log.info("[GerenciaViajeService] Gerencia de viaje creada id={} para empresa ruc={}", gv.getId(), ruc);
        return toDto(gv);
    }

    // ── Actualizar ───────────────────────────────────────────────────────
    @Transactional
    public GerenciaViajeDto update(Long id, GerenciaViajeDto dto) {
        GerenciaViaje gv = gerenciaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Gerencia de viaje no encontrada con id: " + id));

        if ("ACTIVO".equalsIgnoreCase(gv.getEstado())) {
            BigDecimal km = dto.getKmInicial() != null ? dto.getKmInicial() : gv.getKmInicial();
            String placa = dto.getVehiculoInicio() != null ? dto.getVehiculoInicio() : gv.getVehiculoInicio();
            assertKmInicialValid(gv.getBusiness().getId(), placa, km, id);
        }

        applyDto(dto, gv);
        gv = gerenciaRepository.save(gv);
        log.info("[GerenciaViajeService] Gerencia de viaje actualizada id={}", id);
        return toDto(gv);
    }

    /** Cierra una gerencia abierta: km final, fecha de cierre y estado COMPLETADO. */
    @Transactional
    public GerenciaViajeDto cerrar(Long id, GerenciaViajeCierreRequest req) {
        if (req == null || req.getKmFinal() == null || req.getFechaCierre() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Debe indicar kilometraje final y fecha de cierre.");
        }
        GerenciaViaje gv = gerenciaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Gerencia de viaje no encontrada con id: " + id));
        if (!"ACTIVO".equalsIgnoreCase(gv.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Solo se puede cerrar una gerencia que esté abierta (ACTIVO).");
        }
        if (gv.getKmInicial() != null && req.getKmFinal().compareTo(gv.getKmInicial()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El kilometraje final no puede ser menor que el kilometraje inicial.");
        }
        gv.setKmFinal(req.getKmFinal());
        gv.setFechaCierre(req.getFechaCierre());
        gv.setEstado("COMPLETADO");
        gv = gerenciaRepository.save(gv);
        log.info("[GerenciaViajeService] Gerencia de viaje cerrada id={}", id);
        return toDto(gv);
    }

    @Transactional(readOnly = true)
    public Optional<GerenciaViajeDto> findAbiertaByRucAndCedula(String ruc, String cedula) {
        if (cedula == null || cedula.isBlank()) {
            return Optional.empty();
        }
        return gerenciaRepository
                .findFirstByBusiness_RucAndCedulaAndEstadoOrderByFechaHoraDesc(ruc, cedula.trim(), "ACTIVO")
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<BigDecimal> getUltimoKmRegistradoParaPlaca(String ruc, String placa) {
        Business business = businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Empresa no encontrada con RUC: " + ruc));
        if (placa == null || placa.isBlank()) {
            return Optional.empty();
        }
        return gerenciaRepository.findMaxKmFinalClosedForPlaca(business.getId(), placa.trim());
    }

    private void assertNoOpenGerenciaForConductor(Long businessId, String cedula) {
        if (cedula == null || cedula.isBlank()) {
            return;
        }
        if (gerenciaRepository.existsByBusiness_IdAndCedulaAndEstado(businessId, cedula.trim(), "ACTIVO")) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El conductor tiene una gerencia de viaje abierta. Debe cerrarla antes de crear una nueva.");
        }
    }

    private void assertKmInicialValid(Long businessId, String placa, BigDecimal kmInicial, Long excludeGerenciaId) {
        if (placa == null || placa.isBlank() || kmInicial == null) {
            return;
        }
        String p = placa.trim();
        Optional<BigDecimal> maxOpt = excludeGerenciaId == null
                ? gerenciaRepository.findMaxKmFinalClosedForPlaca(businessId, p)
                : gerenciaRepository.findMaxKmFinalClosedForPlacaExcluding(businessId, p, excludeGerenciaId);
        maxOpt.ifPresent(maxKm -> {
            if (kmInicial.compareTo(maxKm) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Kilometraje inicial inválido: debe ser mayor o igual al último kilometraje registrado para esta placa ("
                                + maxKm + " km).");
            }
        });
    }

    // ── Cambiar estado ───────────────────────────────────────────────────
    @Transactional
    public GerenciaViajeDto updateEstado(Long id, String estado) {
        GerenciaViaje gv = gerenciaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Gerencia de viaje no encontrada con id: " + id));
        gv.setEstado(estado.toUpperCase());
        gv = gerenciaRepository.save(gv);
        return toDto(gv);
    }

    // ── Eliminar ─────────────────────────────────────────────────────────
    @Transactional
    public void delete(Long id) {
        if (!gerenciaRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Gerencia de viaje no encontrada con id: " + id);
        }
        gerenciaRepository.deleteById(id);
        log.info("[GerenciaViajeService] Gerencia de viaje eliminada id={}", id);
    }

    // ── Estadísticas ─────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Map<String, Long> getStatsForBusiness(String ruc) {
        Business business = businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Empresa no encontrada con RUC: " + ruc));
        long total      = gerenciaRepository.countByBusinessId(business.getId());
        long activos    = gerenciaRepository.countByBusinessIdAndEstado(business.getId(), "ACTIVO");
        long completados = gerenciaRepository.countByBusinessIdAndEstado(business.getId(), "COMPLETADO");
        return Map.of("total", total, "activos", activos, "completados", completados);
    }

    // ── Mapeo entidad → DTO ──────────────────────────────────────────────
    private GerenciaViajeDto toDto(GerenciaViaje e) {
        return GerenciaViajeDto.builder()
                .id(e.getId())
                .businessId(e.getBusiness() != null ? e.getBusiness().getId() : null)
                .businessName(e.getBusiness() != null ? e.getBusiness().getName() : null)
                .businessRuc(e.getBusiness() != null ? e.getBusiness().getRuc() : null)
                .codigo(e.getCodigo())
                .fechaHora(e.getFechaHora())
                .conductor(e.getConductor())
                .cedula(e.getCedula())
                .vehiculoInicio(e.getVehiculoInicio())
                .kmInicial(e.getKmInicial())
                .telefono(e.getTelefono())
                .cargo(e.getCargo())
                .area(e.getArea())
                .proyecto(e.getProyecto())
                .motivo(e.getMotivo())
                .origen(e.getOrigen())
                .destino(e.getDestino())
                .fechaSalida(e.getFechaSalida())
                .horaSalida(e.getHoraSalida())
                .licenciaVigente(e.getLicenciaVigente())
                .manejoDefensivo(e.getManejoDefensivo())
                .inspeccionVehiculo(e.getInspeccionVehiculo())
                .mediosComunicacion(e.getMediosComunicacion())
                .testAlcohol(e.getTestAlcohol())
                .llevaPasajeros(e.getLlevaPasajeros())
                .pasajeros(e.getPasajeros())
                .tipoVehiculo(e.getTipoVehiculo())
                .convoy(e.getConvoy())
                .unidadesConvoy(e.getUnidadesConvoy())
                .tipoCarretera(e.getTipoCarretera())
                .estadoVia(e.getEstadoVia())
                .clima(e.getClima())
                .distancia(e.getDistancia())
                .tipoCarga(e.getTipoCarga())
                .otrosPeligros(e.getOtrosPeligros())
                .horasConduccion(e.getHorasConduccion())
                .horarioViaje(e.getHorarioViaje())
                .descansoConduc(e.getDescansoConduc())
                .riesgosVia(e.getRiesgosVia())
                .medidasControl(e.getMedidasControl())
                .paradasPlanificadas(e.getParadasPlanificadas())
                .kmFinal(e.getKmFinal())
                .fechaCierre(e.getFechaCierre())
                .estado(e.getEstado())
                .createdBy(e.getCreatedBy())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    // ── Mapeo DTO → nueva entidad ────────────────────────────────────────
    private GerenciaViaje fromDto(GerenciaViajeDto dto, Business business) {
        GerenciaViaje e = GerenciaViaje.builder()
                .business(business)
                .build();
        applyDto(dto, e);
        return e;
    }

    // ── Aplicar campos del DTO a entidad existente ───────────────────────
    private void applyDto(GerenciaViajeDto dto, GerenciaViaje e) {
        // codigo, estado, kmFinal y fechaCierre no se modifican vía PUT; usar flujo de cierre o create.
        if (dto.getFechaHora()           != null) e.setFechaHora(dto.getFechaHora());
        if (dto.getConductor()           != null) e.setConductor(dto.getConductor());
        if (dto.getCedula()              != null) e.setCedula(dto.getCedula());
        if (dto.getVehiculoInicio()      != null) e.setVehiculoInicio(dto.getVehiculoInicio());
        if (dto.getKmInicial()           != null) e.setKmInicial(dto.getKmInicial());
        if (dto.getTelefono()            != null) e.setTelefono(dto.getTelefono());
        if (dto.getCargo()               != null) e.setCargo(dto.getCargo());
        if (dto.getArea()                != null) e.setArea(dto.getArea());
        if (dto.getProyecto()            != null) e.setProyecto(dto.getProyecto());
        if (dto.getMotivo()              != null) e.setMotivo(dto.getMotivo());
        if (dto.getOrigen()              != null) e.setOrigen(dto.getOrigen());
        if (dto.getDestino()             != null) e.setDestino(dto.getDestino());
        if (dto.getFechaSalida()         != null) e.setFechaSalida(dto.getFechaSalida());
        if (dto.getHoraSalida()          != null) e.setHoraSalida(dto.getHoraSalida());
        if (dto.getLicenciaVigente()     != null) e.setLicenciaVigente(dto.getLicenciaVigente());
        if (dto.getManejoDefensivo()     != null) e.setManejoDefensivo(dto.getManejoDefensivo());
        if (dto.getInspeccionVehiculo()  != null) e.setInspeccionVehiculo(dto.getInspeccionVehiculo());
        if (dto.getMediosComunicacion()  != null) e.setMediosComunicacion(dto.getMediosComunicacion());
        if (dto.getTestAlcohol()         != null) e.setTestAlcohol(dto.getTestAlcohol());
        if (dto.getLlevaPasajeros()      != null) e.setLlevaPasajeros(dto.getLlevaPasajeros());
        if (dto.getPasajeros()           != null) e.setPasajeros(dto.getPasajeros());
        if (dto.getTipoVehiculo()        != null) e.setTipoVehiculo(dto.getTipoVehiculo());
        if (dto.getConvoy()              != null) e.setConvoy(dto.getConvoy());
        if (dto.getUnidadesConvoy()      != null) e.setUnidadesConvoy(dto.getUnidadesConvoy());
        if (dto.getTipoCarretera()       != null) e.setTipoCarretera(dto.getTipoCarretera());
        if (dto.getEstadoVia()           != null) e.setEstadoVia(dto.getEstadoVia());
        if (dto.getClima()               != null) e.setClima(dto.getClima());
        if (dto.getDistancia()           != null) e.setDistancia(dto.getDistancia());
        if (dto.getTipoCarga()           != null) e.setTipoCarga(dto.getTipoCarga());
        if (dto.getOtrosPeligros()       != null) e.setOtrosPeligros(dto.getOtrosPeligros());
        if (dto.getHorasConduccion()     != null) e.setHorasConduccion(dto.getHorasConduccion());
        if (dto.getHorarioViaje()        != null) e.setHorarioViaje(dto.getHorarioViaje());
        if (dto.getDescansoConduc()      != null) e.setDescansoConduc(dto.getDescansoConduc());
        if (dto.getRiesgosVia()          != null) e.setRiesgosVia(dto.getRiesgosVia());
        if (dto.getMedidasControl()      != null) e.setMedidasControl(dto.getMedidasControl());
        if (dto.getParadasPlanificadas() != null) e.setParadasPlanificadas(dto.getParadasPlanificadas());
        if (dto.getCreatedBy()           != null) e.setCreatedBy(dto.getCreatedBy());
    }

    @Transactional(readOnly = true)
    public String previewNextCodigo(String ruc) {
        Business business = businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Empresa no encontrada con RUC: " + ruc));
        return generateNextCodigo(business);
    }

    private String generateNextCodigo(Business business) {
        String prefix = "GV-" + LocalDate.now().getYear() + "-";
        int max = 0;
        List<GerenciaViaje> list = gerenciaRepository.findByBusiness_IdOrderByFechaHoraDesc(business.getId());
        for (GerenciaViaje gv : list) {
            String c = gv.getCodigo();
            if (c == null) continue;
            if (!c.startsWith(prefix)) continue;
            String tail = c.substring(prefix.length());
            try {
                int n = Integer.parseInt(tail);
                if (n > max) max = n;
            } catch (NumberFormatException ignored) {}
        }
        int next = max + 1;
        return prefix + String.format("%04d", next);
    }

    /**
     * Completa scoreA–J y totales cruzando los textos guardados en la gerencia con los niveles
     * de la primera metodología de riesgo asignada a la empresa.
     */
    private void enrichRiskScores(GerenciaViajeDto dto, Long businessId) {
        List<Long> metaIds = businessRepository.findMetodologiaRiesgoIdsByBusinessId(businessId);
        if (metaIds == null || metaIds.isEmpty()) {
            return;
        }
        MetodologiaRiesgo met = metodologiaRiesgoRepository
                .findByIdWithParametrosAndNiveles(metaIds.get(0))
                .orElse(null);
        if (met == null || met.getParametros() == null || met.getParametros().isEmpty()) {
            return;
        }

        List<ParametroMetodologia> params = new ArrayList<>(met.getParametros());
        params.sort(Comparator
                .comparing((ParametroMetodologia p) -> p.getDisplayOrder() == null ? Integer.MAX_VALUE : p.getDisplayOrder())
                .thenComparing(ParametroMetodologia::getId, Comparator.nullsLast(Comparator.naturalOrder())));

        int idx = 0;
        for (ParametroMetodologia param : params) {
            char letter = resolveScoreLetter(param, idx++);
            if (letter < 'A' || letter > 'J') {
                continue;
            }
            String selected = gerenciaFieldForLetter(dto, letter);
            Integer pts = matchNivelPuntos(param, selected);
            if (pts != null) {
                setScoreLetter(dto, letter, pts);
            }
        }

        int total = 0;
        int count = 0;
        for (char c = 'A'; c <= 'J'; c++) {
            Integer v = getScoreLetter(dto, c);
            if (v != null) {
                total += v;
                count++;
            }
        }
        if (count == 0) {
            return;
        }
        dto.setScoreTotal(total);
        if (total < 3500) {
            dto.setNivelRiesgo("BAJO");
            dto.setNivelRiesgoRomano("I");
            dto.setAceptacionGerencia("Aceptable");
        } else if (total < 7500) {
            dto.setNivelRiesgo("MEDIO");
            dto.setNivelRiesgoRomano("II");
            dto.setAceptacionGerencia("Aceptable con Controles");
        } else {
            dto.setNivelRiesgo("ALTO");
            dto.setNivelRiesgoRomano("III");
            dto.setAceptacionGerencia("No aceptable");
        }
    }

    private static char resolveScoreLetter(ParametroMetodologia p, int orderIndex) {
        if (p.getCode() != null) {
            String c = p.getCode().trim().toUpperCase();
            if (c.length() == 1) {
                char ch = c.charAt(0);
                if (ch >= 'A' && ch <= 'J') {
                    return ch;
                }
            }
        }
        String n = ((p.getName() != null ? p.getName() : "") + " "
                + (p.getDescription() != null ? p.getDescription() : "")).toUpperCase();
        if (n.contains("DISTANCIA")) {
            return 'A';
        }
        if ((n.contains("TIPO") || n.contains("TIPOS")) && (n.contains("VÍA") || n.contains("VIA"))) {
            return 'B';
        }
        if (n.contains("CLIMA") || n.contains("CONDICIONES CLIM") || n.contains("CONDICIONES CLIMÁT")) {
            return 'C';
        }
        if (n.contains("HORARIO") && (n.contains("CIRCUL") || n.contains("CIRCULACI"))) {
            return 'D';
        }
        if (n.contains("ESTADO") && (n.contains("CARRETER") || n.contains("CARRETERA"))) {
            return 'E';
        }
        if ((n.contains("TIPO") || n.contains("TIPOS")) && n.contains("CARGA")) {
            return 'F';
        }
        if (n.contains("HORAS") && n.contains("CONDUCCI")) {
            return 'G';
        }
        if (n.contains("DESCANSO")) {
            return 'H';
        }
        if (n.contains("COMUNICAC")) {
            return 'I';
        }
        if (n.contains("PASAJERO")) {
            return 'J';
        }
        if (orderIndex >= 0 && orderIndex <= 9) {
            return (char) ('A' + orderIndex);
        }
        return 0;
    }

    private static String gerenciaFieldForLetter(GerenciaViajeDto dto, char letter) {
        return switch (letter) {
            case 'A' -> dto.getDistancia();
            case 'B' -> dto.getTipoCarretera();
            case 'C' -> dto.getClima();
            case 'D' -> dto.getHorarioViaje();
            case 'E' -> dto.getEstadoVia();
            case 'F' -> dto.getTipoCarga();
            case 'G' -> dto.getHorasConduccion();
            case 'H' -> dto.getDescansoConduc();
            case 'I' -> dto.getMediosComunicacion();
            case 'J' -> dto.getLlevaPasajeros();
            default -> null;
        };
    }

    private static void setScoreLetter(GerenciaViajeDto dto, char letter, int value) {
        switch (letter) {
            case 'A' -> dto.setScoreA(value);
            case 'B' -> dto.setScoreB(value);
            case 'C' -> dto.setScoreC(value);
            case 'D' -> dto.setScoreD(value);
            case 'E' -> dto.setScoreE(value);
            case 'F' -> dto.setScoreF(value);
            case 'G' -> dto.setScoreG(value);
            case 'H' -> dto.setScoreH(value);
            case 'I' -> dto.setScoreI(value);
            case 'J' -> dto.setScoreJ(value);
            default -> { }
        }
    }

    private static Integer getScoreLetter(GerenciaViajeDto dto, char letter) {
        return switch (letter) {
            case 'A' -> dto.getScoreA();
            case 'B' -> dto.getScoreB();
            case 'C' -> dto.getScoreC();
            case 'D' -> dto.getScoreD();
            case 'E' -> dto.getScoreE();
            case 'F' -> dto.getScoreF();
            case 'G' -> dto.getScoreG();
            case 'H' -> dto.getScoreH();
            case 'I' -> dto.getScoreI();
            case 'J' -> dto.getScoreJ();
            default -> null;
        };
    }

    private static Integer matchNivelPuntos(ParametroMetodologia param, String selectedText) {
        if (selectedText == null || selectedText.isBlank() || param.getNiveles() == null) {
            return null;
        }
        String sel = normalizeForMatch(selectedText);
        NivelParametro best = null;
        int bestLen = -1;
        for (NivelParametro n : param.getNiveles()) {
            if (n.getNombre() == null) {
                continue;
            }
            String nom = normalizeForMatch(n.getNombre());
            if (nom.isEmpty()) {
                continue;
            }
            if (sel.equals(nom)) {
                return (int) Math.round(n.getValor());
            }
            if (sel.contains(nom) || nom.contains(sel)) {
                if (nom.length() > bestLen) {
                    bestLen = nom.length();
                    best = n;
                }
            }
        }
        if (best != null) {
            return (int) Math.round(best.getValor());
        }
        return null;
    }

    private static String normalizeForMatch(String s) {
        return s.trim()
                .toLowerCase()
                .replace('á', 'a')
                .replace('é', 'e')
                .replace('í', 'i')
                .replace('ó', 'o')
                .replace('ú', 'u')
                .replaceAll("\\s+", " ");
    }
}
