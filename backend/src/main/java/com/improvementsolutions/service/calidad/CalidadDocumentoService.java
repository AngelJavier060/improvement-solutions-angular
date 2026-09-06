package com.improvementsolutions.service.calidad;

import com.improvementsolutions.dto.calidad.CalidadDocumentoDto;
import com.improvementsolutions.dto.calidad.CalidadDocumentoRequest;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.Iso9001CatalogItem;
import com.improvementsolutions.model.calidad.CalidadDocumento;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.Iso9001CatalogItemRepository;
import com.improvementsolutions.repository.calidad.CalidadDocumentoRepository;
import com.improvementsolutions.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CalidadDocumentoService {

    private static final Pattern CODE_PATTERN = Pattern.compile("^[A-Z0-9]{2,5}$");

    private final CalidadDocumentoRepository repository;
    private final BusinessRepository businessRepository;
    private final Iso9001CatalogItemRepository catalogItemRepository;
    private final FileStorageService fileStorageService;

    public List<CalidadDocumentoDto> list(String ruc) {
        Business business = requireBusiness(ruc);
        return repository.findByBusiness_IdOrderByCodigoAsc(business.getId()).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public CalidadDocumentoDto get(String ruc, Long id) {
        Business business = requireBusiness(ruc);
        CalidadDocumento doc = repository.findByIdAndBusiness_Id(id, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado"));
        return toDto(doc);
    }

    @Transactional
    public CalidadDocumentoDto create(String ruc, CalidadDocumentoRequest req, MultipartFile file) throws IOException {
        Business business = requireBusiness(ruc);
        if (req == null || req.getNombre() == null || req.getNombre().isBlank()) {
            throw new IllegalArgumentException("El nombre del documento es obligatorio");
        }

        CalidadDocumento parent = null;
        if (req.getParentId() != null) {
            parent = repository.findByIdAndBusiness_Id(req.getParentId(), business.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Documento padre no encontrado"));
        }

        ResolvedTipo tipo = resolveTipo(business, req);
        ResolvedProceso proceso = resolveProceso(business, req, parent);

        String codigo = parent == null
                ? nextRootCodigo(business.getId(), proceso.code, tipo.code)
                : nextChildCodigo(business.getId(), parent.getCodigo(), tipo.code);

        if (repository.existsByBusiness_IdAndCodigo(business.getId(), codigo)) {
            throw new IllegalStateException("Ya existe un documento con código " + codigo);
        }

        CalidadDocumento doc = new CalidadDocumento();
        doc.setBusiness(business);
        doc.setParentId(parent != null ? parent.getId() : null);
        doc.setProcesoCatalogItemId(proceso.catalogItemId);
        doc.setProcesoName(proceso.name);
        doc.setProcesoCode(proceso.code);
        doc.setTipoCatalogItemId(tipo.catalogItemId);
        doc.setTipoName(tipo.name);
        doc.setTipoCode(tipo.code);
        doc.setCodigo(codigo);
        applyCommonFields(doc, req);

        if (file != null && !file.isEmpty()) {
            storeFile(doc, business.getId(), file);
        }

        return toDto(repository.save(doc));
    }

    @Transactional
    public CalidadDocumentoDto update(String ruc, Long id, CalidadDocumentoRequest req, MultipartFile file) throws IOException {
        Business business = requireBusiness(ruc);
        CalidadDocumento doc = repository.findByIdAndBusiness_Id(id, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado"));
        if (req == null || req.getNombre() == null || req.getNombre().isBlank()) {
            throw new IllegalArgumentException("El nombre del documento es obligatorio");
        }
        // Código / proceso / tipo / padre no se cambian en update (trazabilidad)
        applyCommonFields(doc, req);
        if (file != null && !file.isEmpty()) {
            deleteStoredFileQuietly(doc.getFilePath());
            storeFile(doc, business.getId(), file);
        }
        return toDto(repository.save(doc));
    }

    @Transactional
    public void delete(String ruc, Long id) {
        Business business = requireBusiness(ruc);
        CalidadDocumento doc = repository.findByIdAndBusiness_Id(id, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado"));
        if (repository.countByParentId(id) > 0) {
            throw new IllegalStateException("No se puede eliminar: tiene documentos internos. Elimine primero los hijos.");
        }
        deleteStoredFileQuietly(doc.getFilePath());
        repository.delete(doc);
    }

    public Resource loadFile(String ruc, Long id) {
        Business business = requireBusiness(ruc);
        CalidadDocumento doc = repository.findByIdAndBusiness_Id(id, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado"));
        if (doc.getFilePath() == null || doc.getFilePath().isBlank()) {
            throw new IllegalArgumentException("El documento no tiene archivo adjunto");
        }
        return fileStorageService.loadFileAsResource(doc.getFilePath());
    }

    public String fileDownloadName(String ruc, Long id) {
        Business business = requireBusiness(ruc);
        CalidadDocumento doc = repository.findByIdAndBusiness_Id(id, business.getId())
                .orElseThrow(() -> new IllegalArgumentException("Documento no encontrado"));
        if (doc.getFileName() != null && !doc.getFileName().isBlank()) {
            return doc.getFileName();
        }
        return doc.getCodigo() + ".bin";
    }

    private void applyCommonFields(CalidadDocumento doc, CalidadDocumentoRequest req) {
        doc.setNombre(req.getNombre().trim());
        doc.setFechaElaboracion(parseDate(req.getFechaElaboracion()));
        doc.setFechaRevision(parseDate(req.getFechaRevision()));
        doc.setVersion(blankTo(req.getVersion(), "01"));
        doc.setFechaProxRevision(parseDate(req.getFechaProxRevision()));
        doc.setDiasVigencia(req.getDiasVigencia());
        doc.setEstado(blankTo(req.getEstado(), "VIGENTE").toUpperCase(Locale.ROOT));
        doc.setAlmacenamiento(trimToNull(req.getAlmacenamiento()));
        doc.setResponsable(trimToNull(req.getResponsable()));
        doc.setVigencia(trimToNull(req.getVigencia()));
        doc.setDisposicionFinal(trimToNull(req.getDisposicionFinal()));
        doc.setObservaciones(trimToNull(req.getObservaciones()));
    }

    private void storeFile(CalidadDocumento doc, Long businessId, MultipartFile file) throws IOException {
        String path = fileStorageService.storeFile(file, "calidad/" + businessId);
        doc.setFilePath(path);
        String original = file.getOriginalFilename();
        doc.setFileName(original != null ? original : path.substring(path.lastIndexOf('/') + 1));
    }

    private void deleteStoredFileQuietly(String path) {
        if (path == null || path.isBlank()) {
            return;
        }
        try {
            fileStorageService.deleteFile(path);
        } catch (Exception ignored) {
            /* no bloquear borrado de registro */
        }
    }

    private String nextRootCodigo(Long businessId, String procesoCode, String tipoCode) {
        String prefix = procesoCode + "-" + tipoCode + "-";
        return prefix + pad2(nextSeq(businessId, prefix));
    }

    private String nextChildCodigo(Long businessId, String parentCodigo, String tipoCode) {
        String prefix = parentCodigo + "." + tipoCode + ".";
        return prefix + pad2(nextSeq(businessId, prefix));
    }

    private int nextSeq(Long businessId, String prefix) {
        int max = 0;
        for (String codigo : repository.findCodigosByBusinessAndPrefix(businessId, prefix + "%")) {
            if (codigo == null || !codigo.startsWith(prefix)) {
                continue;
            }
            String rest = codigo.substring(prefix.length());
            if (rest.matches("^\\d{2}$")) {
                max = Math.max(max, Integer.parseInt(rest));
            }
        }
        return max + 1;
    }

    private ResolvedProceso resolveProceso(Business business, CalidadDocumentoRequest req, CalidadDocumento parent) {
        if (parent != null) {
            return new ResolvedProceso(parent.getProcesoCatalogItemId(), parent.getProcesoName(), parent.getProcesoCode());
        }
        if (req.getProcesoCatalogItemId() != null) {
            Iso9001CatalogItem item = requireAssignedCatalogItem(business, req.getProcesoCatalogItemId(), "proceso");
            String code = normalizeCode(item.getCode(), item.getName());
            return new ResolvedProceso(item.getId(), item.getName(), code);
        }
        String code = normalizeCode(req.getProcesoCode(), req.getProcesoName());
        String name = trimRequired(req.getProcesoName(), "El proceso es obligatorio");
        return new ResolvedProceso(null, name, code);
    }

    private ResolvedTipo resolveTipo(Business business, CalidadDocumentoRequest req) {
        if (req.getTipoCatalogItemId() != null) {
            Iso9001CatalogItem item = requireAssignedCatalogItem(business, req.getTipoCatalogItemId(), "tipo-documento");
            String code = normalizeCode(item.getCode(), item.getName());
            return new ResolvedTipo(item.getId(), item.getName(), code);
        }
        String code = normalizeCode(req.getTipoCode(), req.getTipoName());
        String name = trimRequired(req.getTipoName(), "El tipo de documento es obligatorio");
        return new ResolvedTipo(null, name, code);
    }

    private Iso9001CatalogItem requireAssignedCatalogItem(Business business, Long itemId, String expectedCatalog) {
        Iso9001CatalogItem item = catalogItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Ítem de catálogo no encontrado: " + itemId));
        if (!expectedCatalog.equals(item.getCatalogCode())) {
            throw new IllegalArgumentException("El ítem no pertenece al catálogo " + expectedCatalog);
        }
        // Multiempresa: el documento queda ligado a business_id; el ítem es del catálogo global ISO.
        return item;
    }

    private String normalizeCode(String rawCode, String nameFallback) {
        String code = rawCode == null ? "" : rawCode.trim().toUpperCase(Locale.ROOT);
        if (code.isBlank()) {
            code = inventCodeFromName(nameFallback);
        }
        if (!CODE_PATTERN.matcher(code).matches()) {
            throw new IllegalArgumentException("Código inválido (2–5 letras/números): " + code);
        }
        return code;
    }

    private String inventCodeFromName(String name) {
        if (name == null || name.isBlank()) {
            return "XX";
        }
        String n = name.toUpperCase(Locale.ROOT)
                .replaceAll("[ÁÀÄÂ]", "A")
                .replaceAll("[ÉÈËÊ]", "E")
                .replaceAll("[ÍÌÏÎ]", "I")
                .replaceAll("[ÓÒÖÔ]", "O")
                .replaceAll("[ÚÙÜÛ]", "U")
                .replaceAll("[^A-Z0-9 ]", " ")
                .trim();
        if (n.contains("PROCED")) return "PRO";
        if (n.contains("MANUAL")) return "MAN";
        if (n.contains("INSTRUCT")) return "INS";
        if (n.contains("FORMAT") || n.contains("REGISTRO")) return "FOR";
        if (n.contains("TALENTO") || n.contains("HUMANO")) return "TH";
        if (n.contains("CALIDAD")) return "CAL";
        String[] words = n.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (w.isEmpty() || w.equals("DE") || w.equals("DEL") || w.equals("LA") || w.equals("EL")) {
                continue;
            }
            sb.append(w.charAt(0));
            if (sb.length() >= 3) {
                break;
            }
        }
        String c = sb.toString();
        if (c.length() < 2) {
            c = n.replaceAll("[^A-Z0-9]", "");
            c = c.length() >= 2 ? c.substring(0, Math.min(3, c.length())) : (c + "XX").substring(0, 2);
        }
        return c.substring(0, Math.min(5, c.length()));
    }

    private Business requireBusiness(String ruc) {
        if (ruc == null || ruc.isBlank()) {
            throw new IllegalArgumentException("RUC requerido");
        }
        return businessRepository.findByRuc(ruc.trim())
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada para RUC " + ruc));
    }

    private CalidadDocumentoDto toDto(CalidadDocumento d) {
        CalidadDocumentoDto dto = new CalidadDocumentoDto();
        dto.setId(d.getId());
        dto.setParentId(d.getParentId());
        dto.setProcesoCatalogItemId(d.getProcesoCatalogItemId());
        dto.setProcesoName(d.getProcesoName());
        dto.setProcesoCode(d.getProcesoCode());
        dto.setTipoCatalogItemId(d.getTipoCatalogItemId());
        dto.setTipoName(d.getTipoName());
        dto.setTipoCode(d.getTipoCode());
        dto.setCodigo(d.getCodigo());
        dto.setNombre(d.getNombre());
        dto.setFechaElaboracion(d.getFechaElaboracion());
        dto.setFechaRevision(d.getFechaRevision());
        dto.setVersion(d.getVersion());
        dto.setFechaProxRevision(d.getFechaProxRevision());
        dto.setDiasVigencia(d.getDiasVigencia());
        dto.setEstado(d.getEstado());
        dto.setAlmacenamiento(d.getAlmacenamiento());
        dto.setResponsable(d.getResponsable());
        dto.setVigencia(d.getVigencia());
        dto.setDisposicionFinal(d.getDisposicionFinal());
        dto.setObservaciones(d.getObservaciones());
        dto.setFileName(d.getFileName());
        dto.setFilePath(d.getFilePath());
        dto.setCreatedAt(d.getCreatedAt());
        dto.setUpdatedAt(d.getUpdatedAt());
        return dto;
    }

    private static LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return LocalDate.parse(raw.trim());
    }

    private static String blankTo(String v, String def) {
        return v == null || v.isBlank() ? def : v.trim();
    }

    private static String trimToNull(String v) {
        if (v == null || v.isBlank()) {
            return null;
        }
        return v.trim();
    }

    private static String trimRequired(String v, String msg) {
        if (v == null || v.isBlank()) {
            throw new IllegalArgumentException(msg);
        }
        return v.trim();
    }

    private static String pad2(int n) {
        return n < 10 ? "0" + n : String.valueOf(n);
    }

    private record ResolvedProceso(Long catalogItemId, String name, String code) {}
    private record ResolvedTipo(Long catalogItemId, String name, String code) {}
}
