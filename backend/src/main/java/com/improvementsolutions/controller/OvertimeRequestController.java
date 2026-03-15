package com.improvementsolutions.controller;

import com.improvementsolutions.model.OvertimeActivity;
import com.improvementsolutions.model.OvertimeRequest;
import com.improvementsolutions.service.OvertimeRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/api/attendance/{businessId}/overtime-requests")
@RequiredArgsConstructor
public class OvertimeRequestController {

    private final OvertimeRequestService service;

    @GetMapping
    public ResponseEntity<?> getAll(
            @PathVariable Long businessId,
            @RequestParam(required = false) String period) {
        try {
            List<Map<String, Object>> result = service.getByBusiness(businessId, period)
                    .stream().map(this::toMap).toList();
            return ResponseEntity.ok(result);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long businessId, @PathVariable Long id) {
        return service.getById(businessId, id)
                .map(r -> ResponseEntity.ok(toMap(r)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/employee/{employeeId}")
    public ResponseEntity<?> create(
            @PathVariable Long businessId,
            @PathVariable Long employeeId,
            @RequestBody Map<String, Object> body) {
        try {
            OvertimeRequest saved = service.create(businessId, employeeId, body);
            return ResponseEntity.ok(toMap(saved));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/upload-signed")
    public ResponseEntity<?> uploadSigned(
            @PathVariable Long businessId,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        try {
            OvertimeRequest updated = service.uploadSignedPdf(businessId, id, file);
            return ResponseEntity.ok(toMap(updated));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Error al guardar el PDF: " + e.getMessage()));
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long businessId,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        try {
            String status = body.get("status");
            OvertimeRequest updated = service.updateStatus(businessId, id, status);
            return ResponseEntity.ok(toMap(updated));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long businessId, @PathVariable Long id) {
        try {
            service.delete(businessId, id);
            return ResponseEntity.ok(Map.of("deleted", id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<Resource> downloadPdf(@PathVariable Long businessId, @PathVariable Long id) {
        Optional<OvertimeRequest> opt = service.getById(businessId, id);
        if (opt.isEmpty() || opt.get().getSignedPdfPath() == null) {
            return ResponseEntity.<Resource>notFound().build();
        }
        try {
            Path path = Paths.get(opt.get().getSignedPdfPath());
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists()) return ResponseEntity.<Resource>notFound().build();
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"overtime_" + id + ".pdf\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.<Resource>internalServerError().build();
        }
    }

    // ── mapper ──────────────────────────────────────────────────────────────
    private Map<String, Object> toMap(OvertimeRequest r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",              r.getId());
        m.put("employeeId",      r.getEmployee().getId());
        m.put("employeeName",    r.getEmployee().getFullName());
        m.put("employeeCedula",  r.getEmployee().getCedula());
        m.put("employeePosition",r.getEmployee().getPosition());
        m.put("reportPeriod",    r.getReportPeriod());
        m.put("supervisorName",  r.getSupervisorName());
        m.put("department",      r.getDepartment());
        m.put("area",            r.getArea());
        m.put("recognitionType", r.getRecognitionType());
        m.put("status",          r.getStatus());
        m.put("signedPdfPath",   r.getSignedPdfPath());
        m.put("notes",           r.getNotes());
        m.put("createdAt",       r.getCreatedAt() != null ? r.getCreatedAt().toString() : null);
        m.put("approvedAt",      r.getApprovedAt() != null ? r.getApprovedAt().toString() : null);

        double totalHours = 0;
        List<Map<String, Object>> acts = new ArrayList<>();
        for (OvertimeActivity a : r.getActivities()) {
            Map<String, Object> am = new LinkedHashMap<>();
            am.put("id",           a.getId());
            am.put("activityDate", a.getActivityDate() != null ? a.getActivityDate().toString() : null);
            am.put("startTime",    a.getStartTime() != null ? a.getStartTime().toString() : null);
            am.put("endTime",      a.getEndTime() != null ? a.getEndTime().toString() : null);
            am.put("hoursTotal",   a.getHoursTotal());
            am.put("description",  a.getDescription());
            am.put("supportDoc",   a.getSupportDoc());
            acts.add(am);
            totalHours += a.getHoursTotal();
        }
        m.put("activities",  acts);
        m.put("totalHours",  Math.round(totalHours * 10.0) / 10.0);
        m.put("totalDays",   acts.size());
        return m;
    }
}
