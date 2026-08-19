package com.improvementsolutions.service;

import com.improvementsolutions.dto.fleet.FleetVehicleWriteDto;
import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.FleetComplianceDocumentRepository;
import com.improvementsolutions.repository.FleetVehicleDocumentRepository;
import com.improvementsolutions.repository.FleetVehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class FleetVehicleService {

    private static final Set<String> ESTADOS_ACTIVO = Set.of("ACTIVO", "EN_TALLER", "DADO_DE_BAJA");
    private static final long MAX_DOC_BYTES = 52_428_800L; // 50 MiB

    private final FleetVehicleRepository fleetVehicleRepository;
    private final FleetVehicleDocumentRepository fleetVehicleDocumentRepository;
    private final FleetComplianceDocumentRepository fleetComplianceDocumentRepository;
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
        // Consulta dedicada: lista completa ordenada (misma fuente que ficha-catalogs)
        out.put("entidadRemitentes", toIdNameList(businessService.listEntidadRemitentesByBusinessId(full.getId())));
        out.put("tipoVehiculos", toIdNameList(full.getTipoVehiculos()));
        out.put("marcaVehiculos", toIdNameList(full.getMarcaVehiculos()));
        out.put("colorVehiculos", toIdNameList(full.getColorVehiculos()));
        out.put("paisOrigenes", toIdNameList(full.getPaisOrigenes()));
        out.put("tipoCombustibles", toIdNameList(full.getTipoCombustibles()));
        out.put("estadoUnidades", toIdNameList(full.getEstadoUnidades()));
        out.put("transmisiones", toIdNameList(full.getTransmisiones()));
        out.put("propietarioVehiculos", toIdNameList(full.getPropietarioVehiculos()));
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
                    } else if (o instanceof PropietarioVehiculo t) {
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
                        m.put("category", t.getCategoryOrDefault());
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
        long dadoBaja = fleetVehicleRepository.countByBusiness_IdAndEstadoActivo(business.getId(), "DADO_DE_BAJA");

        Map<String, Object> kpis = new LinkedHashMap<>();
        long n = fleetVehicleRepository.countByBusiness_Id(business.getId());
        double salud = n == 0 ? 100.0 : Math.round((activos * 1000.0 / n)) / 10.0;
        kpis.put("saludOperativa", salud);
        kpis.put("saludOperativaTendencia", 0.0);
        // En taller = mantenimientos en curso; críticas = fuera de servicio
        kpis.put("programadosHoy", enTaller);
        kpis.put("estadoActivo", activos);
        kpis.put("alertasCriticas", dadoBaja);
        kpis.put("dadoDeBaja", dadoBaja);
        kpis.put("totalFlota", n);
        kpis.put("enTaller", enTaller);

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
                .propietario(blankToNull(dto.getPropietario()))
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
        applyPropietario(v, full, dto);
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
        applyPropietario(v, full, dto);
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
        assertInCollection(dto.getPropietarioVehiculoId(), b.getPropietarioVehiculos(), "Propietario");
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
        if (x instanceof PropietarioVehiculo t) return t.getId();
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

    private PropietarioVehiculo resolvePropietario(Business b, Long id) {
        if (id == null) return null;
        return b.getPropietarioVehiculos().stream().filter(t -> id.equals(t.getId())).findFirst().orElse(null);
    }

    private void applyPropietario(FleetVehicle v, Business b, FleetVehicleWriteDto dto) {
        PropietarioVehiculo cat = resolvePropietario(b, dto.getPropietarioVehiculoId());
        v.setPropietarioVehiculo(cat);
        if (cat != null) {
            v.setPropietario(cat.getName());
        } else {
            v.setPropietario(blankToNull(dto.getPropietario()));
        }
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
        m.put("propietario", v.getPropietarioVehiculo() != null ? v.getPropietarioVehiculo().getName() : v.getPropietario());
        m.put("propietarioVehiculoId", v.getPropietarioVehiculo() != null ? v.getPropietarioVehiculo().getId() : null);
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

    /** Descarga/visualización autenticada del PDF de flota (ruta anidada segura). */
    @Transactional(readOnly = true)
    public ResponseEntity<Resource> downloadVehicleDocument(String ruc, Long vehicleId, Long docId) throws MalformedURLException {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        fleetVehicleRepository.findByIdAndBusiness_Id(vehicleId, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));
        FleetVehicleDocument doc = fleetVehicleDocumentRepository.findByIdAndFleetVehicle_Id(docId, vehicleId)
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado"));

        Path base = Paths.get(uploadDir).resolve("fleet").normalize();
        Path filePath = Paths.get(uploadDir).resolve(doc.getStoredPath()).normalize();
        if (!filePath.startsWith(base) || !Files.isRegularFile(filePath)) {
            throw new IllegalArgumentException("Archivo no encontrado en disco");
        }

        Resource resource = new UrlResource(filePath.toUri());
        if (!resource.exists() || !resource.isReadable()) {
            throw new IllegalArgumentException("Archivo no legible");
        }

        String contentType = doc.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = "application/pdf";
        }
        String filename = doc.getOriginalFilename() != null ? doc.getOriginalFilename() : ("doc-" + docId + ".pdf");
        filename = filename.replace("\"", "");

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=60")
                .body(resource);
    }

    /**
     * ZIP con los PDF vigentes de una unidad. Ámbito: empresa (RUC) + vehículo.
     */
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> downloadCurrentDocumentsZip(String ruc, Long vehicleId) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        FleetVehicle vehicle = fleetVehicleRepository.findByIdAndBusiness_Id(vehicleId, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));

        Path base = Paths.get(uploadDir).resolve("fleet").normalize();
        List<FleetComplianceDocument> rows =
                fleetComplianceDocumentRepository.findByFleetVehicleIdWithFile(vehicleId);

        record ZipItem(String entryName, Path path) {}
        List<ZipItem> items = new ArrayList<>();
        Set<String> usedNames = new HashSet<>();
        Set<Long> usedFileIds = new HashSet<>();

        for (FleetComplianceDocument row : rows) {
            if (row == null) continue;
            if (Boolean.FALSE.equals(row.getActive()) || Boolean.TRUE.equals(row.getHistoricMode())) continue;
            FleetVehicleDocument file = row.getFleetVehicleDocument();
            if (file == null || file.getId() == null || !usedFileIds.add(file.getId())) continue;
            if (file.getStoredPath() == null || file.getStoredPath().isBlank()) continue;
            Path filePath = Paths.get(uploadDir).resolve(file.getStoredPath()).normalize();
            if (!filePath.startsWith(base) || !Files.isRegularFile(filePath)) continue;
            items.add(new ZipItem(
                    uniqueZipEntryName(row.getTypeLabel(), file.getOriginalFilename(), file.getId(), usedNames),
                    filePath
            ));
        }

        if (items.isEmpty()) {
            throw new IllegalArgumentException("No hay PDF adjuntos vigentes para esta unidad");
        }

        String zipName = zipDownloadName(vehicle);
        byte[] zipBytes;
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(baos)) {
                byte[] buf = new byte[8192];
                for (ZipItem item : items) {
                    zos.putNextEntry(new ZipEntry(item.entryName()));
                    try (InputStream in = Files.newInputStream(item.path())) {
                        int n;
                        while ((n = in.read(buf)) >= 0) {
                            zos.write(buf, 0, n);
                        }
                    }
                    zos.closeEntry();
                }
            }
            zipBytes = baos.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo comprimir los PDF de la unidad", e);
        }

        String encoded = URLEncoder.encode(zipName, StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + zipName.replace("\"", "") + "\"; filename*=UTF-8''" + encoded)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .contentLength(zipBytes.length)
                .body(zipBytes);
    }

    private static String zipDownloadName(FleetVehicle vehicle) {
        String placa = vehicle.getPlaca() != null ? vehicle.getPlaca().trim() : "";
        String codigo = vehicle.getCodigoEquipo() != null ? vehicle.getCodigoEquipo().trim() : "";
        String raw = "documentacion";
        if (!placa.isBlank()) raw += "_" + placa;
        if (!codigo.isBlank() && !codigo.equalsIgnoreCase(placa)) raw += "_" + codigo;
        return sanitizeZipPart(raw) + ".zip";
    }

    private static String uniqueZipEntryName(String typeLabel, String originalFilename, Long fileId, Set<String> used) {
        String base = sanitizeZipPart(typeLabel);
        if (base.isBlank()) {
            String orig = originalFilename != null ? originalFilename : "";
            int slash = Math.max(orig.lastIndexOf('/'), orig.lastIndexOf('\\'));
            base = sanitizeZipPart(slash >= 0 ? orig.substring(slash + 1) : orig);
        }
        if (base.isBlank()) base = "documento_" + fileId;
        if (!base.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            base = base + ".pdf";
        }
        String name = base;
        int i = 1;
        while (used.contains(name.toLowerCase(Locale.ROOT))) {
            String stem = base.replaceAll("(?i)\\.pdf$", "");
            name = stem + "_" + i + ".pdf";
            i++;
        }
        used.add(name.toLowerCase(Locale.ROOT));
        return name;
    }

    private static String sanitizeZipPart(String raw) {
        if (raw == null) return "";
        String s = raw.trim().replaceAll("[\\\\/:*?\"<>|]+", "_").replaceAll("\\s+", "_");
        s = s.replaceAll("[^\\p{L}\\p{N}._-]+", "_").replaceAll("_+", "_");
        if (s.length() > 80) s = s.substring(0, 80);
        return s.replaceAll("^_+|_+$", "");
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

    @Transactional
    public List<Map<String, Object>> listComplianceDocumentsByRuc(String ruc) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        // Solo alinea categorías; NO reimporta PDF (eso recreaba filas tras eliminar)
        List<EntidadRemitente> catalog =
                businessService.listEntidadRemitentesByBusinessId(business.getId());
        List<FleetVehicle> vehicles = fleetVehicleRepository
                .findByBusiness_IdOrderByUpdatedAtDesc(business.getId(), PageRequest.of(0, 2000))
                .getContent();
        for (FleetVehicle v : vehicles) {
            realignComplianceWithCatalog(v, catalog);
        }
        return fleetComplianceDocumentRepository.findByBusinessRuc(ruc).stream()
                .map(d -> toComplianceResponse(d, ruc))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<Map<String, Object>> listComplianceDocuments(String ruc, Long vehicleId) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        FleetVehicle v = fleetVehicleRepository.findByIdAndBusiness_Id(vehicleId, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));
        List<EntidadRemitente> catalog =
                businessService.listEntidadRemitentesByBusinessId(business.getId());
        realignComplianceWithCatalog(v, catalog);
        archiveOlderActiveDuplicates(vehicleId);
        return fleetComplianceDocumentRepository.findByFleetVehicle_IdOrderByUpdatedAtDesc(vehicleId).stream()
                .map(d -> toComplianceResponse(d, ruc))
                .collect(Collectors.toList());
    }

    /** Importación explícita de PDFs huérfanos (no se llama en cada listado). */
    @Transactional
    public List<Map<String, Object>> recoverOrphanComplianceDocuments(String ruc, Long vehicleId) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        FleetVehicle v = fleetVehicleRepository.findByIdAndBusiness_Id(vehicleId, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));
        List<EntidadRemitente> catalog =
                businessService.listEntidadRemitentesByBusinessId(business.getId());
        importOrphanFilesForVehicle(v, catalog);
        realignComplianceWithCatalog(v, catalog);
        cleanupJunkCompliance(v, catalog);
        return fleetComplianceDocumentRepository.findByFleetVehicle_IdOrderByUpdatedAtDesc(vehicleId).stream()
                .map(d -> toComplianceResponse(d, ruc))
                .collect(Collectors.toList());
    }

    /**
     * Crea filas de compliance para PDFs huérfanos, usando el catálogo de
     * entidad remitente de la empresa (nombre + categoría).
     */
    private void importOrphanFilesForVehicle(FleetVehicle v, List<EntidadRemitente> catalog) {
        if (v == null || v.getId() == null) return;
        Long vehicleId = v.getId();
        Set<Long> linked = fleetComplianceDocumentRepository.findByFleetVehicle_IdOrderByUpdatedAtDesc(vehicleId)
                .stream()
                .map(c -> c.getFleetVehicleDocument() != null ? c.getFleetVehicleDocument().getId() : null)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<FleetVehicleDocument> files =
                fleetVehicleDocumentRepository.findByFleetVehicle_IdOrderByCreatedAtDesc(vehicleId);
        for (FleetVehicleDocument f : files) {
            if (linked.contains(f.getId())) continue;
            String rawLabel = labelFromFile(f);
            if (isJunkLabel(rawLabel, f.getOriginalFilename())) {
                log.info("[Fleet] PDF huérfano omitido (etiqueta basura) id={} label={}", f.getId(), rawLabel);
                continue;
            }
            EntidadRemitente matched = matchEntidadRemitente(rawLabel, f.getOriginalFilename(), catalog);
            String typeLabel = matched != null ? matched.getName() : rawLabel;
            String typeCode = matched != null ? "er_" + matched.getId() : "OTRO";
            String category = matched != null
                    ? normalizeCategory(matched.getCategoryOrDefault())
                    : "DOCUMENTOS_PRINCIPALES";

            FleetComplianceDocument doc = FleetComplianceDocument.builder()
                    .fleetVehicle(v)
                    .typeCode(typeCode)
                    .typeLabel(typeLabel)
                    .docCategory(category)
                    .referenceId("PDF-" + f.getId())
                    .issueDate(f.getCreatedAt() != null ? f.getCreatedAt().toLocalDate() : null)
                    .expiryDate(null)
                    .active(true)
                    .historicMode(false)
                    .fileName(f.getOriginalFilename())
                    .fileSizeLabel(f.getFileSize() != null ? formatBytes(f.getFileSize()) : null)
                    .fleetVehicleDocument(f)
                    .build();
            fleetComplianceDocumentRepository.save(doc);
            linked.add(f.getId());
            log.info("[Fleet] Compliance recuperado PDF id={} -> {} [{}]", f.getId(), typeLabel, category);
        }
    }

    /** Alinea filas existentes al catálogo de entidad remitente (grupo / nombre / código). */
    private void realignComplianceWithCatalog(FleetVehicle v, List<EntidadRemitente> catalog) {
        if (v == null || v.getId() == null || catalog == null || catalog.isEmpty()) return;
        List<FleetComplianceDocument> docs =
                fleetComplianceDocumentRepository.findByFleetVehicle_IdOrderByUpdatedAtDesc(v.getId());
        for (FleetComplianceDocument doc : docs) {
            EntidadRemitente matched = matchByTypeCode(doc.getTypeCode(), catalog);
            if (matched == null) {
                matched = matchEntidadRemitente(doc.getTypeLabel(), doc.getFileName(), catalog);
            }
            if (matched == null) continue;
            String newCode = "er_" + matched.getId();
            String newCat = normalizeCategory(matched.getCategoryOrDefault());
            boolean changed = false;
            if (!Objects.equals(doc.getTypeCode(), newCode)) {
                doc.setTypeCode(newCode);
                changed = true;
            }
            if (!Objects.equals(doc.getTypeLabel(), matched.getName())) {
                doc.setTypeLabel(matched.getName());
                changed = true;
            }
            if (!Objects.equals(normalizeCategory(doc.getDocCategory()), newCat)) {
                doc.setDocCategory(newCat);
                changed = true;
            }
            if (changed) {
                fleetComplianceDocumentRepository.save(doc);
                log.info("[Fleet] Compliance realineado id={} -> {} [{}]", doc.getId(), matched.getName(), newCat);
            }
        }
    }

    private static EntidadRemitente matchByTypeCode(String typeCode, List<EntidadRemitente> catalog) {
        if (typeCode == null || !typeCode.startsWith("er_")) return null;
        try {
            Long id = Long.parseLong(typeCode.substring(3).trim());
            return catalog.stream().filter(t -> t != null && id.equals(t.getId())).findFirst().orElse(null);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Elimina registros recuperados con etiqueta basura (p.ej. "PESOS") que no están en el catálogo. */
    private void cleanupJunkCompliance(FleetVehicle v, List<EntidadRemitente> catalog) {
        if (v == null || v.getId() == null) return;
        List<FleetComplianceDocument> docs =
                fleetComplianceDocumentRepository.findByFleetVehicle_IdOrderByUpdatedAtDesc(v.getId());
        for (FleetComplianceDocument doc : docs) {
            if (!isJunkLabel(doc.getTypeLabel(), doc.getFileName())) continue;
            EntidadRemitente matched = matchEntidadRemitente(doc.getTypeLabel(), doc.getFileName(), catalog);
            if (matched != null) continue; // se puede realinear
            Long fileId = doc.getFleetVehicleDocument() != null ? doc.getFleetVehicleDocument().getId() : null;
            fleetComplianceDocumentRepository.delete(doc);
            log.info("[Fleet] Compliance basura eliminado label={} fileId={}", doc.getTypeLabel(), fileId);
        }
    }

    private static boolean isJunkLabel(String label, String filename) {
        String n = normalizeText(label);
        if (n.isEmpty()) return true;
        // Etiquetas genéricas / errores de carga antigua (no son tipos del catálogo)
        if (n.equals("pesos") || n.equals("peso") || n.equals("otro") || n.equals("documento")) return true;
        // Cédula mal cargada como documentación de flota
        if (n.contains("cedula") && n.contains("papeleta")) return true;
        String nf = normalizeText(filename);
        if (nf.contains("cedula") && (n.equals("pesos") || n.length() <= 5)) return true;
        return false;
    }

    private static EntidadRemitente matchEntidadRemitente(
            String label, String filename, List<EntidadRemitente> catalog) {
        if (catalog == null || catalog.isEmpty()) return null;
        String nLabel = normalizeText(label);
        String nFile = normalizeText(filename);
        EntidadRemitente best = null;
        int bestScore = 0;
        for (EntidadRemitente t : catalog) {
            if (t == null || t.getName() == null) continue;
            String nName = normalizeText(t.getName());
            if (nName.isEmpty()) continue;
            int score = 0;
            if (!nLabel.isEmpty() && nLabel.equals(nName)) score = 100;
            else if (!nLabel.isEmpty() && (nLabel.contains(nName) || nName.contains(nLabel)) && nLabel.length() >= 6) {
                score = 70 + Math.min(nName.length(), 20);
            } else if (!nFile.isEmpty() && nFile.contains(nName) && nName.length() >= 6) {
                score = 50 + Math.min(nName.length(), 20);
            }
            if (score > bestScore) {
                bestScore = score;
                best = t;
            }
        }
        return bestScore >= 50 ? best : null;
    }

    private static String normalizeText(String raw) {
        if (raw == null) return "";
        String s = raw.replaceFirst("(?i)^Documentación:\\s*", "").trim().toLowerCase(Locale.ROOT);
        s = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        s = s.replaceAll("[^a-z0-9]+", " ").trim().replaceAll("\\s+", " ");
        return s;
    }

    private static String labelFromFile(FleetVehicleDocument f) {
        String desc = f.getDescription();
        if (desc != null && !desc.isBlank()) {
            String cleaned = desc.replaceFirst("(?i)^Documentación:\\s*", "").trim();
            if (!cleaned.isEmpty()) return cleaned;
        }
        if (f.getOriginalFilename() != null && !f.getOriginalFilename().isBlank()) {
            return f.getOriginalFilename();
        }
        return "Documento #" + f.getId();
    }

    private static String formatBytes(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format(Locale.US, "%.1f KB", bytes / 1024.0);
        return String.format(Locale.US, "%.1f MB", bytes / (1024.0 * 1024.0));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listApplicableDocsForVehicle(String ruc, Long vehicleId) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        FleetVehicle v = fleetVehicleRepository.findByIdAndBusiness_Id(vehicleId, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("vehicleId", vehicleId);
        out.put("businessId", business.getId());

        TipoVehiculo tipo = v.getTipoVehiculo();
        if (tipo == null || tipo.getId() == null) {
            out.put("tipoVehiculoId", null);
            out.put("tipoVehiculoName", null);
            out.put("configured", false);
            out.put("message", "Asigne un tipo de vehículo en la ficha de la unidad para filtrar los documentos aplicables.");
            out.put("documentos", List.of());
            return out;
        }

        Long tipoId = tipo.getId();
        out.put("tipoVehiculoId", tipoId);
        out.put("tipoVehiculoName", tipo.getName());

        List<Map<String, Object>> docs = businessService.listDocumentosByTipoVehiculo(business.getId(), tipoId);
        out.put("configured", true);
        out.put("documentos", docs);
        if (docs.isEmpty()) {
            out.put("message",
                    "No hay documentos configurados para el tipo \"" + tipo.getName()
                            + "\". Configure \"Documentos por tipo\" en administración de la empresa.");
        } else {
            out.put("message", null);
        }
        return out;
    }

    /**
     * Valida que el documento (ER) sea aplicable al tipo del vehículo.
     * @param existingErId si no es null y coincide con el nuevo, se permite (edición de historial).
     */
    private void assertComplianceDocAllowed(
            Business business,
            FleetVehicle vehicle,
            Long entidadRemitenteId,
            String typeCode,
            Long existingErId) {
        TipoVehiculo tipo = vehicle.getTipoVehiculo();
        if (tipo == null || tipo.getId() == null) {
            throw new IllegalArgumentException(
                    "Asigne un tipo de vehículo en la ficha antes de registrar documentación.");
        }

        Long erId = entidadRemitenteId;
        if (erId == null && typeCode != null && typeCode.startsWith("er_")) {
            try {
                erId = Long.parseLong(typeCode.substring(3).trim());
            } catch (NumberFormatException ignored) {
                erId = null;
            }
        }
        if (erId == null) {
            throw new IllegalArgumentException("Debe seleccionar un documento válido de la empresa.");
        }

        // Edición: conservar el mismo documento aunque ya no esté en el set del tipo
        if (existingErId != null && existingErId.equals(erId)) {
            return;
        }

        long configured = businessService.countDocumentosForTipo(business.getId(), tipo.getId());
        if (configured <= 0) {
            throw new IllegalArgumentException(
                    "No hay documentos configurados para el tipo \"" + tipo.getName()
                            + "\". Configure Documentos por tipo en administración de la empresa.");
        }
        if (!businessService.isDocumentoApplicableToTipo(business.getId(), tipo.getId(), erId)) {
            throw new IllegalArgumentException(
                    "El documento seleccionado no aplica al tipo de vehículo \"" + tipo.getName() + "\".");
        }
    }

    @Transactional
    public Map<String, Object> createComplianceDocument(String ruc, Long vehicleId, Map<String, Object> body) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        FleetVehicle v = fleetVehicleRepository.findByIdAndBusiness_Id(vehicleId, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));

        String typeCode = str(body.get("typeCode"));
        String typeLabel = str(body.get("typeLabel"));
        if (typeCode == null || typeCode.isBlank()) {
            throw new IllegalArgumentException("typeCode es requerido");
        }
        if (typeLabel == null || typeLabel.isBlank()) {
            typeLabel = typeCode;
        }

        Long erId = longOrNull(body.get("entidadRemitenteId"));
        assertComplianceDocAllowed(business, v, erId, typeCode, null);

        FleetVehicleDocument attached = resolveAttachedFile(vehicleId, longOrNull(body.get("attachedFleetDocumentId")));

        FleetComplianceDocument doc = FleetComplianceDocument.builder()
                .fleetVehicle(v)
                .typeCode(typeCode.trim())
                .typeLabel(typeLabel.trim())
                .docCategory(normalizeCategory(str(body.get("docCategory"))))
                .entidadRemitenteId(erId)
                .entidadRemitenteName(blankToNull(str(body.get("entidadRemitenteName"))))
                .referenceId(blankToNull(str(body.get("referenceId"))))
                .issueDate(parseDate(body.get("issueDate")))
                .expiryDate(parseDate(body.get("expiryDate")))
                .active(boolOrDefault(body.get("active"), true))
                .historicMode(boolOrDefault(body.get("historicMode"), false))
                .fileName(blankToNull(str(body.get("fileName"))))
                .fileSizeLabel(blankToNull(str(body.get("fileSizeLabel"))))
                .fleetVehicleDocument(attached)
                .build();

        FleetComplianceDocument saved = fleetComplianceDocumentRepository.save(doc);
        archiveOtherActiveOfSameIdentity(vehicleId, saved);
        return toComplianceResponse(saved, ruc);
    }

    /**
     * Renovación: crea la nueva versión (datos + PDF) y archiva la anterior
     * con su respaldo, en la misma transacción.
     */
    @Transactional
    public Map<String, Object> renewComplianceDocument(
            String ruc, Long vehicleId, Long sourceDocId, Map<String, Object> body) {
        fleetComplianceDocumentRepository
                .findByIdAndFleetVehicle_Id(sourceDocId, vehicleId)
                .orElseThrow(() -> new IllegalArgumentException("Documento a renovar no encontrado"));

        Map<String, Object> created = createComplianceDocument(ruc, vehicleId, body);
        Long keepId = longOrNull(created.get("id"));
        FleetComplianceDocument keep = keepId != null
                ? fleetComplianceDocumentRepository.findByIdAndFleetVehicle_Id(keepId, vehicleId).orElse(null)
                : null;
        if (keep != null) {
            archiveOtherActiveOfSameIdentity(vehicleId, keep);
        } else {
            FleetComplianceDocument source = fleetComplianceDocumentRepository
                    .findByIdAndFleetVehicle_Id(sourceDocId, vehicleId)
                    .orElse(null);
            if (source != null) {
                source.setActive(false);
                source.setHistoricMode(true);
                fleetComplianceDocumentRepository.save(source);
            }
        }
        log.info("[Fleet] Documento {} archivado tras renovación; vigente={}", sourceDocId, created.get("id"));
        return created;
    }

    @Transactional
    public Map<String, Object> updateComplianceDocument(String ruc, Long vehicleId, Long docId, Map<String, Object> body) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        FleetVehicle vehicle = fleetVehicleRepository.findByIdAndBusiness_Id(vehicleId, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));
        FleetComplianceDocument doc = fleetComplianceDocumentRepository.findByIdAndFleetVehicle_Id(docId, vehicleId)
                .orElseThrow(() -> new IllegalArgumentException("Registro de documentación no encontrado"));

        Long existingErId = doc.getEntidadRemitenteId();
        if (existingErId == null && doc.getTypeCode() != null && doc.getTypeCode().startsWith("er_")) {
            try {
                existingErId = Long.parseLong(doc.getTypeCode().substring(3).trim());
            } catch (NumberFormatException ignored) {
                existingErId = null;
            }
        }

        if (body.containsKey("typeCode")) {
            String typeCode = str(body.get("typeCode"));
            if (typeCode == null || typeCode.isBlank()) {
                throw new IllegalArgumentException("typeCode es requerido");
            }
            doc.setTypeCode(typeCode.trim());
        }
        if (body.containsKey("typeLabel")) {
            String typeLabel = str(body.get("typeLabel"));
            if (typeLabel != null && !typeLabel.isBlank()) {
                doc.setTypeLabel(typeLabel.trim());
            }
        }
        if (body.containsKey("docCategory")) {
            doc.setDocCategory(normalizeCategory(str(body.get("docCategory"))));
        }
        if (body.containsKey("entidadRemitenteId")) {
            doc.setEntidadRemitenteId(longOrNull(body.get("entidadRemitenteId")));
        }
        if (body.containsKey("entidadRemitenteName")) {
            doc.setEntidadRemitenteName(blankToNull(str(body.get("entidadRemitenteName"))));
        }

        // Solo revalidar si cambia el documento (ER / typeCode)
        boolean docIdentityChanged = body.containsKey("entidadRemitenteId") || body.containsKey("typeCode");
        if (docIdentityChanged) {
            assertComplianceDocAllowed(
                    business,
                    vehicle,
                    doc.getEntidadRemitenteId(),
                    doc.getTypeCode(),
                    existingErId);
        }

        if (body.containsKey("referenceId")) {
            doc.setReferenceId(blankToNull(str(body.get("referenceId"))));
        }
        if (body.containsKey("issueDate")) {
            doc.setIssueDate(parseDate(body.get("issueDate")));
        }
        if (body.containsKey("expiryDate")) {
            doc.setExpiryDate(parseDate(body.get("expiryDate")));
        }
        if (body.containsKey("active")) {
            doc.setActive(boolOrDefault(body.get("active"), true));
        }
        if (body.containsKey("historicMode")) {
            doc.setHistoricMode(boolOrDefault(body.get("historicMode"), false));
        }
        if (body.containsKey("fileName")) {
            doc.setFileName(blankToNull(str(body.get("fileName"))));
        }
        if (body.containsKey("fileSizeLabel")) {
            doc.setFileSizeLabel(blankToNull(str(body.get("fileSizeLabel"))));
        }
        if (body.containsKey("attachedFleetDocumentId")) {
            doc.setFleetVehicleDocument(resolveAttachedFile(vehicleId, longOrNull(body.get("attachedFleetDocumentId"))));
        }

        return toComplianceResponse(fleetComplianceDocumentRepository.save(doc), ruc);
    }

    @Transactional
    public void deleteComplianceDocument(String ruc, Long vehicleId, Long docId) throws IOException {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC: " + ruc));
        fleetVehicleRepository.findByIdAndBusiness_Id(vehicleId, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado"));
        FleetComplianceDocument doc = fleetComplianceDocumentRepository.findByIdAndFleetVehicle_Id(docId, vehicleId)
                .orElseThrow(() -> new IllegalArgumentException("Registro de documentación no encontrado"));

        Long fileId = doc.getFleetVehicleDocument() != null ? doc.getFleetVehicleDocument().getId() : null;
        fleetComplianceDocumentRepository.delete(doc);
        fleetComplianceDocumentRepository.flush();
        if (fileId != null && !fleetComplianceDocumentRepository.existsByFleetVehicleDocument_Id(fileId)) {
            try {
                deleteVehicleDocument(ruc, vehicleId, fileId);
            } catch (IllegalArgumentException ignored) {
                // archivo ya no existe
            }
        }
    }

    private FleetVehicleDocument resolveAttachedFile(Long vehicleId, Long fileId) {
        if (fileId == null) return null;
        return fleetVehicleDocumentRepository.findByIdAndFleetVehicle_Id(fileId, vehicleId)
                .orElseThrow(() -> new IllegalArgumentException("Archivo PDF no encontrado para la unidad"));
    }

    private Map<String, Object> toComplianceResponse(FleetComplianceDocument d, String ruc) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", d.getId());
        m.put("vehicleId", d.getFleetVehicle() != null ? d.getFleetVehicle().getId() : null);
        m.put("typeCode", d.getTypeCode());
        m.put("typeLabel", d.getTypeLabel());
        m.put("docCategory", d.getDocCategory() != null ? d.getDocCategory() : "DOCUMENTOS_PRINCIPALES");
        m.put("entidadRemitenteId", d.getEntidadRemitenteId());
        m.put("entidadRemitenteName", d.getEntidadRemitenteName());
        m.put("referenceId", d.getReferenceId());
        m.put("issueDate", d.getIssueDate() != null ? d.getIssueDate().toString() : null);
        m.put("expiryDate", d.getExpiryDate() != null ? d.getExpiryDate().toString() : null);
        m.put("active", Boolean.TRUE.equals(d.getActive()));
        m.put("historicMode", Boolean.TRUE.equals(d.getHistoricMode()));
        m.put("fileName", d.getFileName());
        m.put("fileSizeLabel", d.getFileSizeLabel());
        Long fileId = d.getFleetVehicleDocument() != null ? d.getFleetVehicleDocument().getId() : null;
        m.put("attachedFleetDocumentId", fileId);
        Long vehicleId = d.getFleetVehicle() != null ? d.getFleetVehicle().getId() : null;
        String effectiveRuc = ruc;
        if ((effectiveRuc == null || effectiveRuc.isBlank())
                && d.getFleetVehicle() != null
                && d.getFleetVehicle().getBusiness() != null) {
            effectiveRuc = d.getFleetVehicle().getBusiness().getRuc();
        }
        if (fileId != null && vehicleId != null && effectiveRuc != null && !effectiveRuc.isBlank()) {
            m.put(
                    "attachedDocumentUrl",
                    "/api/fleet/" + effectiveRuc + "/vehicles/" + vehicleId + "/documents/" + fileId + "/content"
            );
        } else if (d.getFleetVehicleDocument() != null && d.getFleetVehicleDocument().getStoredPath() != null) {
            m.put("attachedDocumentUrl", "/api/files/" + d.getFleetVehicleDocument().getStoredPath().replace('\\', '/'));
        } else {
            m.put("attachedDocumentUrl", null);
        }
        m.put("createdAt", d.getCreatedAt() != null ? d.getCreatedAt().toString() : null);
        m.put("updatedAt", d.getUpdatedAt() != null ? d.getUpdatedAt().toString() : null);
        return m;
    }

    /** Deja un solo documento vigente por tipo/entidad; el resto pasa a histórico. */
    private void archiveOlderActiveDuplicates(Long vehicleId) {
        List<FleetComplianceDocument> all =
                fleetComplianceDocumentRepository.findByFleetVehicle_IdOrderByUpdatedAtDesc(vehicleId);
        Map<String, List<FleetComplianceDocument>> groups = new LinkedHashMap<>();
        for (FleetComplianceDocument d : all) {
            if (d == null || Boolean.FALSE.equals(d.getActive()) || Boolean.TRUE.equals(d.getHistoricMode())) {
                continue;
            }
            groups.computeIfAbsent(identityKey(d), k -> new ArrayList<>()).add(d);
        }
        for (List<FleetComplianceDocument> group : groups.values()) {
            if (group.size() < 2) continue;
            group.sort(this::compareRecency);
            FleetComplianceDocument keep = group.get(0);
            archiveOtherActiveOfSameIdentity(vehicleId, keep);
        }
    }

    private void archiveOtherActiveOfSameIdentity(Long vehicleId, FleetComplianceDocument keep) {
        if (keep == null || keep.getId() == null) return;
        String key = identityKey(keep);
        List<FleetComplianceDocument> all =
                fleetComplianceDocumentRepository.findByFleetVehicle_IdOrderByUpdatedAtDesc(vehicleId);
        for (FleetComplianceDocument d : all) {
            if (d == null || keep.getId().equals(d.getId())) continue;
            if (Boolean.FALSE.equals(d.getActive()) || Boolean.TRUE.equals(d.getHistoricMode())) continue;
            if (!key.equals(identityKey(d))) continue;
            d.setActive(false);
            d.setHistoricMode(true);
            fleetComplianceDocumentRepository.save(d);
            log.info("[Fleet] Documento duplicado archivado id={} key={}", d.getId(), key);
        }
    }

    private static String identityKey(FleetComplianceDocument d) {
        if (d.getEntidadRemitenteId() != null) {
            return "er:" + d.getEntidadRemitenteId();
        }
        String code = d.getTypeCode() != null ? d.getTypeCode().trim() : "";
        if (code.startsWith("er_")) return code.toLowerCase();
        String label = d.getTypeLabel() != null ? d.getTypeLabel().trim().toLowerCase() : "";
        return (code + "|" + label).toLowerCase();
    }

    /** Más reciente primero (fecha de emisión, luego actualización, luego id). */
    private int compareRecency(FleetComplianceDocument a, FleetComplianceDocument b) {
        LocalDate da = a.getIssueDate();
        LocalDate db = b.getIssueDate();
        if (da != null && db != null && !da.equals(db)) return db.compareTo(da);
        if (da != null && db == null) return -1;
        if (da == null && db != null) return 1;
        java.time.LocalDateTime ua = a.getUpdatedAt();
        java.time.LocalDateTime ub = b.getUpdatedAt();
        if (ua != null && ub != null && !ua.equals(ub)) return ub.compareTo(ua);
        long ia = a.getId() != null ? a.getId() : 0L;
        long ib = b.getId() != null ? b.getId() : 0L;
        return Long.compare(ib, ia);
    }

    private static String normalizeCategory(String raw) {
        if ("CERTIFICACIONES".equals(raw)
                || "LIBERACIONES".equals(raw)
                || "DOCUMENTOS_PRINCIPALES".equals(raw)
                || "DOCUMENTOS_ADICIONALES".equals(raw)) {
            return raw;
        }
        return "DOCUMENTOS_PRINCIPALES";
    }

    private static String str(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static String blankToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static Long longOrNull(Object o) {
        if (o == null || "".equals(o)) return null;
        if (o instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static LocalDate parseDate(Object o) {
        if (o == null || "".equals(o)) return null;
        String s = String.valueOf(o).trim();
        if (s.isEmpty()) return null;
        // admite ISO date o datetime
        if (s.length() >= 10) s = s.substring(0, 10);
        try {
            return LocalDate.parse(s);
        } catch (Exception e) {
            throw new IllegalArgumentException("Fecha inválida: " + o);
        }
    }

    private static boolean boolOrDefault(Object o, boolean def) {
        if (o == null) return def;
        if (o instanceof Boolean b) return b;
        String s = String.valueOf(o).trim().toLowerCase(Locale.ROOT);
        if ("true".equals(s) || "1".equals(s) || "yes".equals(s)) return true;
        if ("false".equals(s) || "0".equals(s) || "no".equals(s)) return false;
        return def;
    }
}
