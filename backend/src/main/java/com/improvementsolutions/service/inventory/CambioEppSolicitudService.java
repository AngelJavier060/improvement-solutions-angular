package com.improvementsolutions.service.inventory;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.CambioEppSolicitud;
import com.improvementsolutions.repository.inventory.CambioEppSolicitudRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CambioEppSolicitudService {

    private static final List<String> PENDIENTES_ENTREGA = List.of("EN_ESPERA_INVENTARIO", "VALIDADO_FIRMADO");

    private final CambioEppSolicitudRepository repository;
    private final InventoryAuthorizationService authService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return repository.findByBusiness_IdOrderByCreatedAtDesc(business.getId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPendientesEntrega(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return repository.findByBusiness_IdAndStatusInOrderByCreatedAtDesc(business.getId(), PENDIENTES_ENTREGA)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /** Tipos de acontecimiento asignados a la empresa (Inventario-Bodega). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAcontecimientoTypesForBusiness(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (business.getInventoryAcontecimientoTypes() != null) {
            business.getInventoryAcontecimientoTypes().size();
        }
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        if (business.getInventoryAcontecimientoTypes() == null) {
            return out;
        }
        business.getInventoryAcontecimientoTypes().stream()
                .filter(t -> t != null && !Boolean.FALSE.equals(t.getActive()))
                .sorted((a, b) -> String.valueOf(a.getName()).compareToIgnoreCase(String.valueOf(b.getName())))
                .forEach(t -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", t.getId());
                    m.put("name", t.getName());
                    m.put("description", t.getDescription());
                    out.add(m);
                });
        return out;
    }

    /** Estados del EPI asignados a la empresa (Inventario-Bodega). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listEstadoEpiForBusiness(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        if (business.getInventoryEstadoEpis() != null) {
            business.getInventoryEstadoEpis().size();
        }
        List<Map<String, Object>> out = new java.util.ArrayList<>();
        if (business.getInventoryEstadoEpis() == null) {
            return out;
        }
        business.getInventoryEstadoEpis().stream()
                .filter(t -> t != null && !Boolean.FALSE.equals(t.getActive()))
                .sorted((a, b) -> String.valueOf(a.getName()).compareToIgnoreCase(String.valueOf(b.getName())))
                .forEach(t -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", t.getId());
                    m.put("name", t.getName());
                    m.put("description", t.getDescription());
                    out.add(m);
                });
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getById(String ruc, Long id) {
        return toDto(requireOwned(ruc, id));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> nextReportNumber(String ruc) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        int year = Year.now().getValue();
        String prefix = "REP-" + year + "-";
        long count = repository.countByBusinessAndReportePrefix(business.getId(), prefix + "%");
        String nReporte = String.format("%s%05d", prefix, count + 1);
        // Evitar colisión si hubo huecos / borrados
        int guard = 0;
        while (repository.existsByBusinessIdAndReportNumber(business.getId(), nReporte) && guard < 1000) {
            count++;
            nReporte = String.format("%s%05d", prefix, count + 1);
            guard++;
        }
        return Map.of("nReporte", nReporte, "year", year);
    }

    @Transactional
    public Map<String, Object> create(String ruc, Map<String, Object> body) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        CambioEppSolicitud entity = new CambioEppSolicitud();
        entity.setBusiness(business);
        applyCreateFields(entity, body);

        if (entity.getNReporte() == null || entity.getNReporte().isBlank()) {
            entity.setNReporte(String.valueOf(nextReportNumber(ruc).get("nReporte")));
        }
        if (repository.existsByBusinessIdAndReportNumber(business.getId(), entity.getNReporte())) {
            throw new IllegalArgumentException("Ya existe una solicitud con el número " + entity.getNReporte());
        }
        entity.setStatus(normalizeStatus(asString(body.get("status"), "PENDIENTE_APROBACION")));
        return toDto(repository.save(entity));
    }

    @Transactional
    public Map<String, Object> markEnEsperaInventario(String ruc, Long id, Map<String, Object> body) {
        CambioEppSolicitud entity = requireOwned(ruc, id);
        String path = asString(body.get("signedFilePath"), "").trim();
        String name = asString(body.get("signedFileName"), "").trim();
        if (path.isEmpty()) {
            throw new IllegalArgumentException("Falta la ruta del documento firmado (signedFilePath).");
        }
        entity.setSignedFilePath(path);
        entity.setSignedFileName(name.isEmpty() ? path.substring(path.lastIndexOf('/') + 1) : name);
        entity.setSignedUploadedAt(LocalDateTime.now());
        entity.setStatus("EN_ESPERA_INVENTARIO");
        entity.setRejectedReason(null);
        entity.setRejectedAt(null);
        return toDto(repository.save(entity));
    }

    @Transactional
    public Map<String, Object> markEntregado(String ruc, Long id, Map<String, Object> body) {
        CambioEppSolicitud entity = requireOwned(ruc, id);
        if (!"EN_ESPERA_INVENTARIO".equals(entity.getStatus()) && !"VALIDADO_FIRMADO".equals(entity.getStatus())) {
            throw new IllegalStateException("La solicitud no está en espera de inventario (estado: " + entity.getStatus() + ").");
        }
        Long outputId = null;
        Object rawOut = body.get("outputId");
        if (rawOut instanceof Number n) outputId = n.longValue();
        else if (rawOut != null && !String.valueOf(rawOut).isBlank()) {
            try { outputId = Long.parseLong(String.valueOf(rawOut)); } catch (Exception ignored) {}
        }
        entity.setOutputId(outputId);
        entity.setOutputNumber(asString(body.get("outputNumber"), null));
        entity.setDeliveredAt(LocalDateTime.now());
        entity.setStatus("VALIDADO_ENTREGADO");
        return toDto(repository.save(entity));
    }

    @Transactional
    public Map<String, Object> markRechazado(String ruc, Long id, Map<String, Object> body) {
        CambioEppSolicitud entity = requireOwned(ruc, id);
        String motivo = asString(body.get("rejectedReason"), asString(body.get("reason"), "")).trim();
        if (motivo.length() < 5) {
            throw new IllegalArgumentException("Indique el motivo del rechazo (mínimo 5 caracteres).");
        }
        entity.setRejectedReason(motivo);
        entity.setRejectedAt(LocalDateTime.now());
        entity.setStatus("RECHAZADO");
        return toDto(repository.save(entity));
    }

    private CambioEppSolicitud requireOwned(String ruc, Long id) {
        Business business = authService.requireBusinessForRucAndCurrentUser(ruc);
        return repository.findByBusiness_IdAndId(business.getId(), id)
                .orElseThrow(() -> new IllegalArgumentException("Solicitud de cambio EPP no encontrada."));
    }

    private void applyCreateFields(CambioEppSolicitud entity, Map<String, Object> body) {
        entity.setNReporte(asString(body.get("nReporte"), null));
        entity.setTrabajador(asString(body.get("trabajador"), "").trim());
        entity.setCedula(asString(body.get("cedula"), "").trim());
        if (entity.getTrabajador().isEmpty() || entity.getCedula().isEmpty()) {
            throw new IllegalArgumentException("Trabajador y cédula son obligatorios.");
        }
        entity.setCargo(asString(body.get("cargo"), null));
        entity.setArea(asString(body.get("area"), null));
        entity.setTipoAcontecimiento(asString(body.get("tipoAcontecimiento"), null));
        entity.setSectionCode(asString(body.get("sectionCode"), null));
        entity.setSectionLabel(asString(body.get("sectionLabel"), null));
        entity.setEstadoEpi(asString(body.get("estadoEpi"), null));
        entity.setSeveridad(asString(body.get("severidad"), null));
        entity.setFechaElaboracion(asString(body.get("fechaElaboracion"), null));

        Object snap = body.get("formSnapshot");
        if (snap != null) {
            try {
                entity.setFormSnapshot(snap instanceof String s ? s : objectMapper.writeValueAsString(snap));
            } catch (Exception e) {
                throw new IllegalArgumentException("formSnapshot inválido.");
            }
        }
    }

    private String normalizeStatus(String status) {
        String s = status == null ? "PENDIENTE_APROBACION" : status.trim();
        if ("VALIDADO_FIRMADO".equals(s)) return "EN_ESPERA_INVENTARIO";
        if ("ENTREGADO".equals(s)) return "VALIDADO_ENTREGADO";
        return s;
    }

    private Map<String, Object> toDto(CambioEppSolicitud e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId() == null ? null : String.valueOf(e.getId()));
        m.put("nReporte", e.getNReporte());
        m.put("trabajador", e.getTrabajador());
        m.put("cedula", e.getCedula());
        m.put("cargo", e.getCargo());
        m.put("area", e.getArea());
        m.put("tipoAcontecimiento", e.getTipoAcontecimiento());
        m.put("sectionCode", e.getSectionCode());
        m.put("sectionLabel", e.getSectionLabel());
        m.put("estadoEpi", e.getEstadoEpi());
        m.put("severidad", e.getSeveridad());
        m.put("fechaElaboracion", e.getFechaElaboracion());
        m.put("status", normalizeStatus(e.getStatus()));
        m.put("formSnapshot", parseSnapshot(e.getFormSnapshot()));
        m.put("signedFileName", e.getSignedFileName());
        m.put("signedFilePath", e.getSignedFilePath());
        m.put("signedUploadedAt", e.getSignedUploadedAt() == null ? null : e.getSignedUploadedAt().toString());
        m.put("outputId", e.getOutputId());
        m.put("outputNumber", e.getOutputNumber());
        m.put("deliveredAt", e.getDeliveredAt() == null ? null : e.getDeliveredAt().toString());
        m.put("rejectedReason", e.getRejectedReason());
        m.put("rejectedAt", e.getRejectedAt() == null ? null : e.getRejectedAt().toString());
        m.put("createdAt", e.getCreatedAt() == null ? null : e.getCreatedAt().toString());
        m.put("updatedAt", e.getUpdatedAt() == null ? null : e.getUpdatedAt().toString());
        return m;
    }

    private Map<String, Object> parseSnapshot(String raw) {
        if (raw == null || raw.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(raw, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private static String asString(Object v, String def) {
        if (v == null) return def;
        String s = String.valueOf(v).trim();
        return s.isEmpty() || "null".equalsIgnoreCase(s) ? def : s;
    }
}
