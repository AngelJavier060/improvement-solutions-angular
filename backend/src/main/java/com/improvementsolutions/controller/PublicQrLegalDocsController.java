package com.improvementsolutions.controller;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.BusinessObligationMatrix;
import com.improvementsolutions.model.BusinessObligationMatrixFile;
import com.improvementsolutions.repository.BusinessObligationMatrixFileRepository;
import com.improvementsolutions.repository.BusinessObligationMatrixRepository;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.service.FileStorageService;
import com.improvementsolutions.service.QrLegalDocsTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/public/qr/legal-docs")
@RequiredArgsConstructor
public class PublicQrLegalDocsController {

    private static final String PUBLIC_TAG = "[PUBLIC]";

    private final QrLegalDocsTokenService tokenService;
    private final BusinessRepository businessRepository;
    private final BusinessObligationMatrixRepository matrixRepository;
    private final BusinessObligationMatrixFileRepository fileRepository;
    private final FileStorageService fileStorageService;

    @GetMapping("/{ruc}")
    public ResponseEntity<Map<String, Object>> list(@PathVariable String ruc, @RequestParam("token") String token) {
        tokenService.validateScopeAndRuc(token, ruc);

        Business business = businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        int tokenVersion = tokenService.getTokenVersion(token);
        int currentVersion = business.getQrLegalDocsTokenVersion() != null ? business.getQrLegalDocsTokenVersion() : 0;
        if (tokenVersion != currentVersion) {
            return ResponseEntity.status(403).build();
        }

        List<BusinessObligationMatrix> matrices = matrixRepository.findByBusinessId(business.getId());
        Map<String, Object> res = new HashMap<>();
        res.put("ruc", ruc);

        res.put("reglamento", resolveDoc("REGLAMENTO", matrices));
        res.put("riesgos", resolveDoc("RIESGOS", matrices));
        res.put("politicaSst", resolveDoc("POLITICA_SST", matrices));

        List<Map<String, Object>> items = buildAllPublicItems(matrices);
        res.put("items", items);

        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, max-age=0")
                .header("Pragma", "no-cache")
                .header("Expires", "0")
                .body(res);
    }

    @GetMapping("/{ruc}/files/{fileId}")
    public ResponseEntity<Resource> preview(@PathVariable String ruc, @PathVariable Long fileId, @RequestParam("token") String token) {
        tokenService.validateScopeAndRuc(token, ruc);

        BusinessObligationMatrixFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado"));

        Business business = businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        int tokenVersion = tokenService.getTokenVersion(token);
        int currentVersion = business.getQrLegalDocsTokenVersion() != null ? business.getQrLegalDocsTokenVersion() : 0;
        if (tokenVersion != currentVersion) {
            return ResponseEntity.status(403).build();
        }

        BusinessObligationMatrix bom = file.getBusinessObligationMatrix();
        if (bom == null || bom.getBusiness() == null || bom.getBusiness().getRuc() == null || !bom.getBusiness().getRuc().equals(ruc)) {
            return ResponseEntity.status(403).build();
        }

        String nameLower = (file.getName() == null ? "" : file.getName().toLowerCase());
        String desc = file.getDescription() == null ? "" : file.getDescription();
        if (!nameLower.endsWith(".pdf") || !desc.contains(PUBLIC_TAG)) {
            return ResponseEntity.status(403).build();
        }

        Resource resource = fileStorageService.loadFileAsResource(file.getPath());
        String filename = file.getName() != null ? file.getName() : "documento.pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, max-age=0")
                .header("Pragma", "no-cache")
                .header("Expires", "0")
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'self'; frame-ancestors 'self'; object-src 'none'")
                .body(resource);
    }

    private Map<String, Object> resolveDoc(String kind, List<BusinessObligationMatrix> matrices) {
        BusinessObligationMatrix target = matrices.stream()
                .filter(m -> matchKind(kind, m))
                .findFirst()
                .orElse(null);

        Map<String, Object> out = new HashMap<>();
        out.put("found", target != null);
        if (target == null) {
            return out;
        }

        out.put("matrixId", target.getId());
        out.put("title", safeText(target.getName()));

        List<BusinessObligationMatrixFile> files = fileRepository.findByBusinessObligationMatrixId(target.getId());
        List<BusinessObligationMatrixFile> publicPdfs = new ArrayList<>();
        for (BusinessObligationMatrixFile f : files) {
            String nameLower = f.getName() == null ? "" : f.getName().toLowerCase();
            String desc = f.getDescription() == null ? "" : f.getDescription();
            if (nameLower.endsWith(".pdf") && desc.contains(PUBLIC_TAG)) {
                publicPdfs.add(f);
            }
        }

        publicPdfs.sort((a, b) -> {
            if (a.getCreatedAt() != null && b.getCreatedAt() != null) {
                int c = a.getCreatedAt().compareTo(b.getCreatedAt());
                if (c != 0) return c;
            }
            long aId = a.getId() != null ? a.getId() : 0;
            long bId = b.getId() != null ? b.getId() : 0;
            return Long.compare(aId, bId);
        });

        if (publicPdfs.isEmpty()) {
            out.put("hasPdf", false);
            return out;
        }

        BusinessObligationMatrixFile latest = publicPdfs.get(publicPdfs.size() - 1);
        out.put("hasPdf", true);
        out.put("fileId", latest.getId());
        out.put("fileName", safeText(latest.getName()));
        return out;
    }

    private List<Map<String, Object>> buildAllPublicItems(List<BusinessObligationMatrix> matrices) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (matrices == null || matrices.isEmpty()) return out;

        for (BusinessObligationMatrix m : matrices) {
            Map<String, Object> doc = resolveDocFromMatrix(m);
            // Incluir solo matrices que tengan al menos un PDF público autorizado
            if (Boolean.TRUE.equals(doc.get("hasPdf"))) {
                out.add(doc);
            }
        }
        return out;
    }

    private Map<String, Object> resolveDocFromMatrix(BusinessObligationMatrix target) {
        Map<String, Object> out = new HashMap<>();
        boolean exists = target != null && target.getId() != null;
        out.put("found", exists);
        if (!exists) return out;

        out.put("matrixId", target.getId());
        out.put("title", safeText(target.getName()));

        // Buscar PDFs públicos asociados a esa matriz
        List<BusinessObligationMatrixFile> files = fileRepository.findByBusinessObligationMatrixId(target.getId());
        List<BusinessObligationMatrixFile> publicPdfs = new ArrayList<>();
        for (BusinessObligationMatrixFile f : files) {
            String nameLower = f.getName() == null ? "" : f.getName().toLowerCase();
            String desc = f.getDescription() == null ? "" : f.getDescription();
            if (nameLower.endsWith(".pdf") && desc.contains(PUBLIC_TAG)) {
                publicPdfs.add(f);
            }
        }

        publicPdfs.sort((a, b) -> {
            if (a.getCreatedAt() != null && b.getCreatedAt() != null) {
                int c = a.getCreatedAt().compareTo(b.getCreatedAt());
                if (c != 0) return c;
            }
            long aId = a.getId() != null ? a.getId() : 0;
            long bId = b.getId() != null ? b.getId() : 0;
            return Long.compare(aId, bId);
        });

        if (publicPdfs.isEmpty()) {
            out.put("hasPdf", false);
            return out;
        }

        BusinessObligationMatrixFile latest = publicPdfs.get(publicPdfs.size() - 1);
        out.put("hasPdf", true);
        out.put("fileId", latest.getId());
        out.put("fileName", safeText(latest.getName()));
        return out;
    }

    private boolean matchKind(String kind, BusinessObligationMatrix m) {
        String name = norm(m != null ? m.getName() : null);
        String desc = norm(m != null ? m.getDescription() : null);
        String hay = (name + " " + desc).trim();

        if ("REGLAMENTO".equals(kind)) {
            return hay.contains("reglamento");
        }
        if ("RIESGOS".equals(kind)) {
            return hay.contains("matriz") && hay.contains("riesg");
        }
        // POLITICA_SST
        return hay.contains("politic") && (hay.contains("sst") || hay.contains("seguridad") || hay.contains("salud"));
    }

    private String norm(String v) {
        if (v == null) return "";
        String s = v.toLowerCase(Locale.ROOT);
        s = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD);
        s = s.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        s = s.replaceAll("\\s+", " ").trim();
        return s;
    }

    private String safeText(String v) {
        return v == null ? "" : v;
    }
}
