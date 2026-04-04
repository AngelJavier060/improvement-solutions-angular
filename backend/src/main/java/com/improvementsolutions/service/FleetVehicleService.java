package com.improvementsolutions.service;

import com.improvementsolutions.dto.fleet.FleetVehicleWriteDto;
import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.FleetVehicleDocumentRepository;
import com.improvementsolutions.repository.FleetVehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FleetVehicleService {

    private static final Set<String> ESTADOS_ACTIVO = Set.of("ACTIVO", "EN_TALLER", "DADO_DE_BAJA");
    private static final long MAX_DOC_BYTES = 52_428_800L; // 50 MiB

    private final FleetVehicleRepository fleetVehicleRepository;
    private final FleetVehicleDocumentRepository fleetVehicleDocumentRepository;
    private final BusinessService businessService;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Transactional(readOnly = true)
    public Map<String, Object> getFichaCatalogsByRuc(String ruc) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        Business full = businessService.findByIdWithAllRelations(business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("businessId", full.getId());
        out.put("businessRuc", full.getRuc());
        out.put("claseVehiculos", toIdNameList(full.getClaseVehiculos()));
        out.put("entidadRemitentes", toIdNameList(full.getEntidadRemitentes()));
        out.put("tipoVehiculos", toIdNameList(full.getTipoVehiculos()));
        out.put("marcaVehiculos", toIdNameList(full.getMarcaVehiculos()));
        out.put("colorVehiculos", toIdNameList(full.getColorVehiculos()));
        out.put("paisOrigenes", toIdNameList(full.getPaisOrigenes()));
        out.put("tipoCombustibles", toIdNameList(full.getTipoCombustibles()));
        out.put("estadoUnidades", toIdNameList(full.getEstadoUnidades()));
        out.put("transmisiones", toIdNameList(full.getTransmisiones()));
        out.put("numeroEjes", toIdNameList(full.getNumeroEjes()));
        out.put("configuracionEjes", toIdNameList(full.getConfiguracionEjes()));
        return out;
    }

    private List<Map<String, Object>> toIdNameList(Collection<?> items) {
        if (items == null) return List.of();
        return items.stream()
                .filter(Objects::nonNull)
                .map(o -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    if (o instanceof TipoVehiculo t) {
                        m.put("id", t.getId());
                        m.put("name", t.getName());
                        m.put("description", t.getDescription());
                    } else if (o instanceof MarcaVehiculo t) {
                        m.put("id", t.getId());
                        m.put("name", t.getName());
                        m.put("description", t.getDescription());
                    } else if (o instanceof ColorVehiculo t) {
                        m.put("id", t.getId());
                        m.put("name", t.getName());
                        m.put("description", t.getDescription());
                    } else if (o instanceof PaisOrigen t) {
                        m.put("id", t.getId());
                        m.put("name", t.getName());
                        m.put("description", t.getDescription());
                    } else if (o instanceof TipoCombustible t) {
                        m.put("id", t.getId());
                        m.put("name", t.getName());
                        m.put("description", t.getDescription());
                    } else if (o instanceof EstadoUnidad t) {
                        m.put("id", t.getId());
                        m.put("name", t.getName());
                        m.put("description", t.getDescription());
                    } else if (o instanceof Transmision t) {
                        m.put("id", t.getId());
                        m.put("name", t.getName());
                        m.put("description", t.getDescription());
                    } else if (o instanceof NumeroEje t) {
                        m.put("id", t.getId());
                        m.put("name", t.getName());
                        m.put("description", t.getDescription());
                    } else if (o instanceof ConfiguracionEje t) {
                        m.put("id", t.getId());
                        m.put("name", t.getName());
                        m.put("description", t.getDescription());
                    } else if (o instanceof ClaseVehiculo t) {
                        m.put("id", t.getId());
                        m.put("name", t.getName());
                        m.put("description", t.getDescription());
                    } else if (o instanceof EntidadRemitente t) {
                        m.put("id", t.getId());
                        m.put("name", t.getName());
                        m.put("description", t.getDescription());
                    }
                    return m;
                })
                .filter(m -> m.containsKey("id"))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listVehicles(String ruc, int page, int pageSize) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        Page<FleetVehicle> pg = fleetVehicleRepository.findByBusiness_IdOrderByUpdatedAtDesc(
                business.getId(), PageRequest.of(Math.max(0, page - 1), Math.min(100, Math.max(1, pageSize))));

        long activos = fleetVehicleRepository.countByBusiness_IdAndEstadoActivo(business.getId(), "ACTIVO");
        long enTaller = fleetVehicleRepository.countByBusiness_IdAndEstadoActivo(business.getId(), "EN_TALLER");

        Map<String, Object> kpis = new LinkedHashMap<>();
        long n = fleetVehicleRepository.countByBusiness_Id(business.getId());
        double salud = n == 0 ? 100.0 : Math.round((activos * 1000.0 / n)) / 10.0;
        kpis.put("saludOperativa", salud);
        kpis.put("saludOperativaTendencia", 0.0);
        kpis.put("programadosHoy", 0);
        kpis.put("estadoActivo", activos);
        kpis.put("alertasCriticas", enTaller);

        List<Map<String, Object>> vehicles = pg.getContent().stream()
                .map(this::toVehicleResponse)
                .collect(Collectors.toList());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("vehicles", vehicles);
        body.put("kpis", kpis);
        body.put("totalCount", pg.getTotalElements());
        body.put("currentPage", page);
        body.put("pageSize", pageSize);
        return body;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getVehicleByRucAndId(String ruc, Long id) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        FleetVehicle v = fleetVehicleRepository.findByIdAndBusiness_Id(id, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));
        return toVehicleResponse(v);
    }

    @Transactional
    public void deleteVehicle(String ruc, Long id) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        FleetVehicle v = fleetVehicleRepository.findByIdAndBusiness_Id(id, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));
        fleetVehicleRepository.delete(v);
    }

    /**
     * Guarda data-URL en disco bajo uploads/fleet/{ruc}/{vehicleId}/ y devuelve ruta pública /api/files/...
     * Si ya es una URL guardada, la devuelve igual.
     */
    private String persistOrPassImage(String value, String ruc, long vehicleId, String slot) throws IOException {
        if (value == null || value.isBlank()) {
            return null;
        }
        String t = value.trim();
        if (!t.startsWith("data:image/")) {
            return t;
        }
        int comma = t.indexOf(',');
        if (comma < 0) {
            return null;
        }
        String meta = t.substring(5, comma).toLowerCase(Locale.ROOT);
        String b64 = t.substring(comma + 1).replaceAll("\\s", "");
        byte[] bytes = Base64.getDecoder().decode(b64);
        String ext = ".jpg";
        if (meta.contains("png")) {
            ext = ".png";
        } else if (meta.contains("webp")) {
            ext = ".webp";
        } else if (meta.contains("gif")) {
            ext = ".gif";
        } else if (meta.contains("jpeg") || meta.contains("jpg")) {
            ext = ".jpg";
        }
        String safeRuc = ruc.replaceAll("[^a-zA-Z0-9_-]", "_");
        String subPath = "fleet/" + safeRuc + "/" + vehicleId;
        Path dir = Paths.get(uploadDir).resolve(subPath).normalize();
        Files.createDirectories(dir);
        String filename = slot + ext;
        Files.write(dir.resolve(filename), bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        return "/api/files/" + subPath.replace('\\', '/') + "/" + filename;
    }

    private void applyPhotosFromDto(FleetVehicle v, FleetVehicleWriteDto dto, String ruc) {
        try {
            if (dto.getFotoPrincipal() != null && !dto.getFotoPrincipal().isBlank()) {
                v.setFotoPrincipal(persistOrPassImage(dto.getFotoPrincipal(), ruc, v.getId(), "principal"));
            }
            if (dto.getFotoLateral() != null && !dto.getFotoLateral().isBlank()) {
                v.setFotoLateral(persistOrPassImage(dto.getFotoLateral(), ruc, v.getId(), "lateral"));
            }
            if (dto.getFotoInterior() != null && !dto.getFotoInterior().isBlank()) {
                v.setFotoInterior(persistOrPassImage(dto.getFotoInterior(), ruc, v.getId(), "interior"));
            }
        } catch (IOException e) {
            log.warn("[Fleet] Error guardando imágenes del vehículo {}: {}", v.getId(), e.getMessage());
        }
    }

    @Transactional
    public Map<String, Object> createVehicle(String ruc, FleetVehicleWriteDto dto) {
        Objects.requireNonNull(dto.getCodigoEquipo(), "codigoEquipo requerido");
        Objects.requireNonNull(dto.getPlaca(), "placa requerida");

        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        Business full = businessService.findByIdWithAllRelations(business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));

        if (fleetVehicleRepository.existsByBusiness_IdAndCodigoEquipoIgnoreCase(full.getId(), dto.getCodigoEquipo().trim())) {
            throw new IllegalArgumentException("Ya existe un vehículo con ese código de equipo");
        }
        if (fleetVehicleRepository.existsByBusiness_IdAndPlacaIgnoreCase(full.getId(), dto.getPlaca().trim())) {
            throw new IllegalArgumentException("Ya existe un vehículo con esa placa");
        }

        assertFk(full, dto);

        String estado = dto.getEstadoActivo() != null ? dto.getEstadoActivo().trim() : "ACTIVO";
        if (!ESTADOS_ACTIVO.contains(estado)) {
            estado = "ACTIVO";
        }

        FleetVehicle v = FleetVehicle.builder()
                .business(full)
                .codigoEquipo(dto.getCodigoEquipo().trim())
                .placa(dto.getPlaca().trim().toUpperCase(Locale.ROOT))
                .modelo(dto.getModelo())
                .anio(dto.getAnio())
                .serieChasis(dto.getSerieChasis())
                .serieMotor(dto.getSerieMotor())
                .estadoActivo(estado)
                .cilindraje(dto.getCilindraje())
                .pasajeros(dto.getPasajeros())
                .tonelaje(dto.getTonelaje())
                .capacidad(dto.getCapacidad())
                .potencia(dto.getPotencia())
                .kmInicio(dto.getKmInicio())
                .largo(dto.getLargo())
                .ancho(dto.getAncho())
                .alto(dto.getAlto())
                .proyectoAsignado(dto.getProyectoAsignado())
                .medidaNeumaticos(dto.getMedidaNeumaticos())
                .marcaNeumatico(dto.getMarcaNeumatico())
                .kmReencauche(dto.getKmReencauche())
                .numeroRepuestos(dto.getNumeroRepuestos() != null ? dto.getNumeroRepuestos() : 0)
                .observaciones(dto.getObservaciones())
                .fotoPrincipal(null)
                .fotoLateral(null)
                .fotoInterior(null)
                .build();

        v.setTipoVehiculo(resolveTipo(full, dto.getTipoVehiculoId()));
        v.setMarcaVehiculo(resolveMarca(full, dto.getMarcaVehiculoId()));
        v.setClaseVehiculo(resolveClaseVehiculo(full, dto.getClaseVehiculoId()));
        v.setEntidadRemitente(resolveEntidadRemitente(full, dto.getEntidadRemitenteId()));
        v.setColorVehiculo(resolveColor(full, dto.getColorVehiculoId()));
        v.setPaisOrigen(resolvePais(full, dto.getPaisOrigenId()));
        v.setTipoCombustible(resolveCombustible(full, dto.getTipoCombustibleId()));
        v.setEstadoUnidad(resolveEstadoUnidad(full, dto.getEstadoUnidadId()));
        v.setTransmision(resolveTransmision(full, dto.getTransmisionId()));
        v.setNumeroEje(resolveNumeroEje(full, dto.getNumeroEjeId()));
        v.setConfiguracionEje(resolveConfiguracionEje(full, dto.getConfiguracionEjeId()));

        FleetVehicle saved = fleetVehicleRepository.save(v);
        applyPhotosFromDto(saved, dto, ruc);
        saved = fleetVehicleRepository.save(saved);
        return toVehicleResponse(saved);
    }

    @Transactional
    public Map<String, Object> updateVehicle(String ruc, Long id, FleetVehicleWriteDto dto) {
        Objects.requireNonNull(dto.getCodigoEquipo(), "codigoEquipo requerido");
        Objects.requireNonNull(dto.getPlaca(), "placa requerida");

        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        Business full = businessService.findByIdWithAllRelations(business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));
        FleetVehicle v = fleetVehicleRepository.findByIdAndBusiness_Id(id, full.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));

        if (fleetVehicleRepository.existsByBusiness_IdAndCodigoEquipoIgnoreCaseAndIdNot(full.getId(), dto.getCodigoEquipo().trim(), id)) {
            throw new IllegalArgumentException("Ya existe otro vehículo con ese código de equipo");
        }
        if (fleetVehicleRepository.existsByBusiness_IdAndPlacaIgnoreCaseAndIdNot(full.getId(), dto.getPlaca().trim(), id)) {
            throw new IllegalArgumentException("Ya existe otro vehículo con esa placa");
        }

        assertFk(full, dto);

        String estado = dto.getEstadoActivo() != null ? dto.getEstadoActivo().trim() : "ACTIVO";
        if (!ESTADOS_ACTIVO.contains(estado)) {
            estado = "ACTIVO";
        }

        v.setCodigoEquipo(dto.getCodigoEquipo().trim());
        v.setPlaca(dto.getPlaca().trim().toUpperCase(Locale.ROOT));
        v.setModelo(dto.getModelo());
        v.setAnio(dto.getAnio());
        v.setSerieChasis(dto.getSerieChasis());
        v.setSerieMotor(dto.getSerieMotor());
        v.setEstadoActivo(estado);
        v.setCilindraje(dto.getCilindraje());
        v.setPasajeros(dto.getPasajeros());
        v.setTonelaje(dto.getTonelaje());
        v.setCapacidad(dto.getCapacidad());
        v.setPotencia(dto.getPotencia());
        v.setKmInicio(dto.getKmInicio());
        v.setLargo(dto.getLargo());
        v.setAncho(dto.getAncho());
        v.setAlto(dto.getAlto());
        v.setProyectoAsignado(dto.getProyectoAsignado());
        v.setMedidaNeumaticos(dto.getMedidaNeumaticos());
        v.setMarcaNeumatico(dto.getMarcaNeumatico());
        v.setKmReencauche(dto.getKmReencauche());
        v.setNumeroRepuestos(dto.getNumeroRepuestos() != null ? dto.getNumeroRepuestos() : 0);
        v.setObservaciones(dto.getObservaciones());

        v.setTipoVehiculo(resolveTipo(full, dto.getTipoVehiculoId()));
        v.setMarcaVehiculo(resolveMarca(full, dto.getMarcaVehiculoId()));
        v.setClaseVehiculo(resolveClaseVehiculo(full, dto.getClaseVehiculoId()));
        v.setEntidadRemitente(resolveEntidadRemitente(full, dto.getEntidadRemitenteId()));
        v.setColorVehiculo(resolveColor(full, dto.getColorVehiculoId()));
        v.setPaisOrigen(resolvePais(full, dto.getPaisOrigenId()));
        v.setTipoCombustible(resolveCombustible(full, dto.getTipoCombustibleId()));
        v.setEstadoUnidad(resolveEstadoUnidad(full, dto.getEstadoUnidadId()));
        v.setTransmision(resolveTransmision(full, dto.getTransmisionId()));
        v.setNumeroEje(resolveNumeroEje(full, dto.getNumeroEjeId()));
        v.setConfiguracionEje(resolveConfiguracionEje(full, dto.getConfiguracionEjeId()));

        applyPhotosFromDto(v, dto, ruc);
        FleetVehicle saved = fleetVehicleRepository.save(v);
        return toVehicleResponse(saved);
    }

    private void assertFk(Business b, FleetVehicleWriteDto dto) {
        assertInCollection(dto.getTipoVehiculoId(), b.getTipoVehiculos(), "Tipo de vehículo");
        assertInCollection(dto.getMarcaVehiculoId(), b.getMarcaVehiculos(), "Marca");
        assertInCollection(dto.getColorVehiculoId(), b.getColorVehiculos(), "Color");
        assertInCollection(dto.getPaisOrigenId(), b.getPaisOrigenes(), "País de origen");
        assertInCollection(dto.getTipoCombustibleId(), b.getTipoCombustibles(), "Tipo de combustible");
        assertInCollection(dto.getEstadoUnidadId(), b.getEstadoUnidades(), "Estado de la unidad");
        assertInCollection(dto.getTransmisionId(), b.getTransmisiones(), "Transmisión");
        assertInCollection(dto.getNumeroEjeId(), b.getNumeroEjes(), "Número de ejes");
        assertInCollection(dto.getConfiguracionEjeId(), b.getConfiguracionEjes(), "Configuración de ejes / neumáticos");
        assertInCollection(dto.getClaseVehiculoId(), b.getClaseVehiculos(), "Clase de vehículo");
        assertInCollection(dto.getEntidadRemitenteId(), b.getEntidadRemitentes(), "Entidad remitente");
    }

    private void assertInCollection(Long id, Collection<?> col, String label) {
        if (id == null) return;
        if (col == null || col.isEmpty()) {
            throw new IllegalArgumentException("La empresa no tiene " + label + " configurado");
        }
        boolean ok = col.stream().anyMatch(x -> id.equals(extractId(x)));
        if (!ok) throw new IllegalArgumentException(label + " no pertenece a la configuración de esta empresa");
    }

    private Long extractId(Object x) {
        if (x instanceof TipoVehiculo t) return t.getId();
        if (x instanceof MarcaVehiculo t) return t.getId();
        if (x instanceof ColorVehiculo t) return t.getId();
        if (x instanceof PaisOrigen t) return t.getId();
        if (x instanceof TipoCombustible t) return t.getId();
        if (x instanceof EstadoUnidad t) return t.getId();
        if (x instanceof Transmision t) return t.getId();
        if (x instanceof NumeroEje t) return t.getId();
        if (x instanceof ConfiguracionEje t) return t.getId();
        if (x instanceof ClaseVehiculo t) return t.getId();
        if (x instanceof EntidadRemitente t) return t.getId();
        return null;
    }

    private TipoVehiculo resolveTipo(Business b, Long id) {
        if (id == null) return null;
        return b.getTipoVehiculos().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    private MarcaVehiculo resolveMarca(Business b, Long id) {
        if (id == null) return null;
        return b.getMarcaVehiculos().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    private ClaseVehiculo resolveClaseVehiculo(Business b, Long id) {
        if (id == null) return null;
        return b.getClaseVehiculos().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    private EntidadRemitente resolveEntidadRemitente(Business b, Long id) {
        if (id == null) return null;
        return b.getEntidadRemitentes().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    private ColorVehiculo resolveColor(Business b, Long id) {
        if (id == null) return null;
        return b.getColorVehiculos().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    private PaisOrigen resolvePais(Business b, Long id) {
        if (id == null) return null;
        return b.getPaisOrigenes().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    private TipoCombustible resolveCombustible(Business b, Long id) {
        if (id == null) return null;
        return b.getTipoCombustibles().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    private EstadoUnidad resolveEstadoUnidad(Business b, Long id) {
        if (id == null) return null;
        return b.getEstadoUnidades().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    private Transmision resolveTransmision(Business b, Long id) {
        if (id == null) return null;
        return b.getTransmisiones().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    private NumeroEje resolveNumeroEje(Business b, Long id) {
        if (id == null) return null;
        return b.getNumeroEjes().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    private ConfiguracionEje resolveConfiguracionEje(Business b, Long id) {
        if (id == null) return null;
        return b.getConfiguracionEjes().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    public Map<String, Object> toVehicleResponse(FleetVehicle v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.getId());
        m.put("codigoEquipo", v.getCodigoEquipo());
        m.put("placa", v.getPlaca());
        m.put("clase", v.getClaseVehiculo() != null ? v.getClaseVehiculo().getName() : null);
        m.put("claseVehiculoId", v.getClaseVehiculo() != null ? v.getClaseVehiculo().getId() : null);
        m.put("entidadRemitente", v.getEntidadRemitente() != null ? v.getEntidadRemitente().getName() : null);
        m.put("entidadRemitenteId", v.getEntidadRemitente() != null ? v.getEntidadRemitente().getId() : null);
        m.put("tipoVehiculo", v.getTipoVehiculo() != null ? v.getTipoVehiculo().getName() : null);
        m.put("tipoVehiculoId", v.getTipoVehiculo() != null ? v.getTipoVehiculo().getId() : null);
        m.put("marca", v.getMarcaVehiculo() != null ? v.getMarcaVehiculo().getName() : null);
        m.put("marcaVehiculoId", v.getMarcaVehiculo() != null ? v.getMarcaVehiculo().getId() : null);
        m.put("modelo", v.getModelo());
        m.put("anio", v.getAnio());
        m.put("serieChasis", v.getSerieChasis());
        m.put("serieMotor", v.getSerieMotor());
        m.put("color", v.getColorVehiculo() != null ? v.getColorVehiculo().getName() : null);
        m.put("colorVehiculoId", v.getColorVehiculo() != null ? v.getColorVehiculo().getId() : null);
        m.put("paisOrigen", v.getPaisOrigen() != null ? v.getPaisOrigen().getName() : null);
        m.put("paisOrigenId", v.getPaisOrigen() != null ? v.getPaisOrigen().getId() : null);
        m.put("tipoCombustible", v.getTipoCombustible() != null ? v.getTipoCombustible().getName() : null);
        m.put("tipoCombustibleId", v.getTipoCombustible() != null ? v.getTipoCombustible().getId() : null);
        m.put("estadoUnidad", v.getEstadoUnidad() != null ? v.getEstadoUnidad().getName() : null);
        m.put("estadoUnidadId", v.getEstadoUnidad() != null ? v.getEstadoUnidad().getId() : null);
        m.put("transmision", v.getTransmision() != null ? v.getTransmision().getName() : null);
        m.put("transmisionId", v.getTransmision() != null ? v.getTransmision().getId() : null);
        m.put("numeroEjeId", v.getNumeroEje() != null ? v.getNumeroEje().getId() : null);
        m.put("numeroEjesLabel", v.getNumeroEje() != null ? v.getNumeroEje().getName() : null);
        m.put("configuracionEjeId", v.getConfiguracionEje() != null ? v.getConfiguracionEje().getId() : null);
        m.put("configuracionEjes", v.getConfiguracionEje() != null ? v.getConfiguracionEje().getName() : null);
        m.put("estadoActivo", v.getEstadoActivo());
        m.put("cilindraje", v.getCilindraje());
        m.put("pasajeros", v.getPasajeros());
        m.put("tonelaje", v.getTonelaje());
        m.put("capacidad", v.getCapacidad());
        m.put("potencia", v.getPotencia());
        m.put("kmInicio", v.getKmInicio());
        m.put("largo", v.getLargo());
        m.put("ancho", v.getAncho());
        m.put("alto", v.getAlto());
        m.put("proyectoAsignado", v.getProyectoAsignado());
        m.put("medidaNeumaticos", v.getMedidaNeumaticos());
        m.put("marcaNeumatico", v.getMarcaNeumatico());
        m.put("kmReencauche", v.getKmReencauche());
        m.put("numeroRepuestos", v.getNumeroRepuestos());
        m.put("observaciones", v.getObservaciones());
        m.put("fotoPrincipal", v.getFotoPrincipal());
        m.put("fotoLateral", v.getFotoLateral());
        m.put("fotoInterior", v.getFotoInterior());
        m.put("ultimoServicio", null);
        m.put("ultimoServicioDescripcion", null);
        m.put("proximoMantenimiento", null);
        m.put("proximoMantenimientoDescripcion", null);
        m.put("kmRestantes", null);
        m.put("businessId", v.getBusiness() != null ? v.getBusiness().getId() : null);
        m.put("businessRuc", v.getBusiness() != null ? v.getBusiness().getRuc() : null);
        m.put("createdAt", v.getCreatedAt() != null ? v.getCreatedAt().toString() : null);
        m.put("updatedAt", v.getUpdatedAt() != null ? v.getUpdatedAt().toString() : null);
        return m;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listVehicleDocuments(String ruc, Long vehicleId) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        fleetVehicleRepository.findByIdAndBusiness_Id(vehicleId, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));
        return fleetVehicleDocumentRepository.findByFleetVehicle_IdOrderByCreatedAtDesc(vehicleId).stream()
                .map(this::toDocumentResponse)
                .collect(Collectors.toList());
    }

    private Map<String, Object> toDocumentResponse(FleetVehicleDocument d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("originalFilename", d.getOriginalFilename());
        m.put("url", "/api/files/" + d.getStoredPath().replace('\\', '/'));
        m.put("contentType", d.getContentType());
        m.put("fileSize", d.getFileSize());
        m.put("description", d.getDescription());
        m.put("createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
        return m;
    }

    @Transactional
    public Map<String, Object> addVehicleDocument(String ruc, Long vehicleId, MultipartFile file, String description) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Archivo requerido");
        }
        if (file.getSize() > MAX_DOC_BYTES) {
            throw new IllegalArgumentException("El archivo supera el tamaño máximo permitido");
        }
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        FleetVehicle v = fleetVehicleRepository.findByIdAndBusiness_Id(vehicleId, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));
        String safeRuc = ruc.replaceAll("[^a-zA-Z0-9_-]", "_");
        String orig = Optional.ofNullable(file.getOriginalFilename()).orElse("documento").replaceAll("[^a-zA-Z0-9._-]", "_");
        if (orig.length() > 200) {
            orig = orig.substring(orig.length() - 200);
        }
        String unique = UUID.randomUUID() + "_" + orig;
        String relPath = "fleet/" + safeRuc + "/" + vehicleId + "/docs/" + unique;
        Path fleetRoot = Paths.get(uploadDir).resolve("fleet").normalize();
        Path dir = fleetRoot.resolve(safeRuc).resolve(String.valueOf(vehicleId)).resolve("docs").normalize();
        if (!dir.startsWith(fleetRoot)) {
            throw new IllegalArgumentException("Ruta inválida");
        }
        Files.createDirectories(dir);
        Path target = dir.resolve(unique).normalize();
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        FleetVehicleDocument doc = FleetVehicleDocument.builder()
                .fleetVehicle(v)
                .originalFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : unique)
                .storedPath(relPath)
                .contentType(file.getContentType())
                .fileSize(file.getSize())
                .description(description != null && !description.isBlank() ? description.trim() : null)
                .build();
        FleetVehicleDocument saved = fleetVehicleDocumentRepository.save(doc);
        return toDocumentResponse(saved);
    }

    @Transactional
    public void deleteVehicleDocument(String ruc, Long vehicleId, Long docId) throws IOException {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        fleetVehicleRepository.findByIdAndBusiness_Id(vehicleId, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));
        FleetVehicleDocument doc = fleetVehicleDocumentRepository.findByIdAndFleetVehicle_Id(docId, vehicleId)
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado"));
        Path filePath = Paths.get(uploadDir).resolve(doc.getStoredPath()).normalize();
        Path base = Paths.get(uploadDir).resolve("fleet").normalize();
        if (!filePath.startsWith(base)) {
            throw new IllegalStateException("Ruta de archivo no permitida");
        }
        fleetVehicleDocumentRepository.delete(doc);
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("[Fleet] No se pudo borrar archivo {}: {}", filePath, e.getMessage());
        }
    }
}
