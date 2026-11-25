package com.improvementsolutions.service;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OvertimeRequestService {

    private final OvertimeRequestRepository requestRepo;
    private final BusinessRepository businessRepo;
    private final BusinessEmployeeRepository employeeRepo;
    private final EmployeeOvertimeRepository overtimeRepo;
    private final AttendanceService attendanceService;

    @Value("${app.storage.location:uploads}")
    private String storageRoot;

    @Transactional
    public List<OvertimeRequest> getByBusiness(Long businessId, String period) {
        List<OvertimeRequest> all = requestRepo.findByBusinessId(businessId);
        for (OvertimeRequest r : all) {
            String effective = effectivePeriod(r);
            if (effective != null && !effective.equals(r.getReportPeriod())) {
                r.setReportPeriod(effective);
                requestRepo.save(r);
            }
        }
        if (period != null && !period.isBlank()) {
            return all.stream()
                    .filter(r -> period.equals(r.getReportPeriod()))
                    .toList();
        }
        return all;
    }

    private String effectivePeriod(OvertimeRequest r) {
        if (r.getActivities() == null || r.getActivities().isEmpty()) {
            return r.getReportPeriod();
        }
        return r.getActivities().stream()
                .map(OvertimeActivity::getActivityDate)
                .filter(java.util.Objects::nonNull)
                .min(LocalDate::compareTo)
                .map(d -> String.format("%04d-%02d", d.getYear(), d.getMonthValue()))
                .orElse(r.getReportPeriod());
    }

    public Optional<OvertimeRequest> getById(Long businessId, Long id) {
        return requestRepo.findById(id)
                .filter(r -> r.getBusiness().getId().equals(businessId));
    }

    @Transactional
    public OvertimeRequest create(Long businessId, Long employeeId, Map<String, Object> body) {
        Business business = businessRepo.findById(businessId)
                .orElseThrow(() -> new NoSuchElementException("Business not found"));
        BusinessEmployee employee = employeeRepo.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("Employee not found"));

        OvertimeRequest req = new OvertimeRequest();
        req.setBusiness(business);
        req.setEmployee(employee);
        req.setReportPeriod((String) body.getOrDefault("reportPeriod", ""));
        req.setSupervisorName((String) body.getOrDefault("supervisorName", ""));
        req.setDepartment((String) body.getOrDefault("department", ""));
        req.setArea((String) body.getOrDefault("area", ""));
        req.setRecognitionType((String) body.getOrDefault("recognitionType", "Pago en Nómina"));
        req.setNotes((String) body.getOrDefault("notes", ""));
        req.setStatus("PENDIENTE");
        String kind = String.valueOf(body.getOrDefault("entryKind", "")).trim().toUpperCase();
        if ("DIA".equals(kind) || "HORA".equals(kind)) {
            req.setEntryKind(kind);
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> activities = (List<Map<String, Object>>) body.get("activities");
        if (activities != null) {
            Set<LocalDate> datesToValidate = new HashSet<>();
            Map<LocalDate, List<String>> descByDate = new HashMap<>();
            for (Map<String, Object> a : activities) {
                OvertimeActivity act = new OvertimeActivity();
                act.setRequest(req);
                String dateStr = (String) a.get("activityDate");
                if (dateStr != null && !dateStr.isBlank()) {
                    LocalDate d = LocalDate.parse(dateStr);
                    act.setActivityDate(d);
                    datesToValidate.add(d);
                    descByDate.computeIfAbsent(d, k -> new ArrayList<>())
                            .add(((String) a.getOrDefault("description", "")).trim());
                }
                String startStr = (String) a.get("startTime");
                if (startStr != null && !startStr.isBlank()) act.setStartTime(LocalTime.parse(startStr));
                String endStr = (String) a.get("endTime");
                if (endStr != null && !endStr.isBlank()) act.setEndTime(LocalTime.parse(endStr));
                if ("DIA".equals(req.getEntryKind())) {
                    if (act.getStartTime() == null) act.setStartTime(LocalTime.MIDNIGHT);
                    if (act.getEndTime() == null) act.setEndTime(LocalTime.MIDNIGHT);
                }
                act.setDescription((String) a.getOrDefault("description", ""));
                act.setSupportDoc((String) a.getOrDefault("supportDoc", ""));
                req.getActivities().add(act);
            }

            if ("DIA".equals(req.getEntryKind())) {
                List<LocalDate> repeated = repeatedExtraDays(businessId, employeeId, datesToValidate);
                if (!repeated.isEmpty()) {
                    String listed = repeated.stream()
                            .sorted()
                            .map(d -> String.format("%02d/%02d/%04d", d.getDayOfMonth(), d.getMonthValue(), d.getYear()))
                            .reduce((a, b) -> a + ", " + b)
                            .orElse("");
                    throw new IllegalArgumentException("Este trabajador ya tiene registrados estos días extras: " + listed + ". No se puede repetir.");
                }
                for (LocalDate d : datesToValidate) {
                    String type = attendanceService.displayedDayType(businessId, employeeId, d);
                    if (type == null) continue;
                    if ("V".equals(type) || "P".equals(type) || "E".equals(type) || "A".equals(type)) {
                        throw new IllegalArgumentException("No es posible registrar un día extra el "
                                + String.format("%02d/%02d/%04d", d.getDayOfMonth(), d.getMonthValue(), d.getYear())
                                + ": ese día ya tiene vacaciones, permiso, enfermedad o accidente.");
                    }
                }
            }
            if (req.getEntryKind() == null) {
                for (LocalDate d : datesToValidate) {
                    String type = attendanceService.computeDayType(businessId, employeeId, d);
                    if ("T".equalsIgnoreCase(type)) {
                        throw new IllegalArgumentException("No es posible registrar horas/días extra el " + d + ": es un día de jornada laboral normal.");
                    }
                }
            }
        }

        String fromDates = effectivePeriod(req);
        if (fromDates != null && !fromDates.isBlank()) {
            req.setReportPeriod(fromDates);
        }

        OvertimeRequest saved = requestRepo.save(req);
        applyToPlanilla(businessId, employee, saved);
        return saved;
    }

    private List<LocalDate> repeatedExtraDays(Long businessId, Long employeeId, Set<LocalDate> incoming) {
        List<LocalDate> repeated = new ArrayList<>();
        List<OvertimeRequest> existing = requestRepo.findByBusinessAndEmployeeWithActivities(businessId, employeeId);
        Set<LocalDate> taken = new HashSet<>();
        for (OvertimeRequest prev : existing) {
            if (prev.getEntryKind() != null && !"DIA".equalsIgnoreCase(prev.getEntryKind())) continue;
            if (prev.getActivities() == null) continue;
            for (OvertimeActivity act : prev.getActivities()) {
                if (act.getActivityDate() != null) taken.add(act.getActivityDate());
            }
        }
        for (LocalDate d : incoming) {
            if (taken.contains(d)) repeated.add(d);
        }
        return repeated;
    }

    private void applyToPlanilla(Long businessId, BusinessEmployee employee, OvertimeRequest saved) {
        if (saved.getActivities() == null || saved.getActivities().isEmpty()) return;
        String kind = saved.getEntryKind();
        if ("HORA".equals(kind)) {
            for (OvertimeActivity act : saved.getActivities()) {
                if (act.getActivityDate() == null || act.getStartTime() == null || act.getEndTime() == null) continue;
                EmployeeOvertime ot = new EmployeeOvertime();
                ot.setBusiness(saved.getBusiness());
                ot.setEmployee(employee);
                ot.setOvertimeDate(act.getActivityDate());
                ot.setStartTime(act.getStartTime());
                ot.setEndTime(act.getEndTime());
                String reason = act.getDescription() == null || act.getDescription().isBlank()
                        ? "Hora extra" : act.getDescription().trim();
                if (reason.length() > 500) reason = reason.substring(0, 500);
                ot.setReason(reason);
                ot.setNotes("REQ:" + saved.getId());
                overtimeRepo.save(ot);
            }
            return;
        }
        if ("DIA".equals(kind)) {
            Set<LocalDate> seen = new HashSet<>();
            for (OvertimeActivity act : saved.getActivities()) {
                if (act.getActivityDate() == null || !seen.add(act.getActivityDate())) continue;
                String desc = act.getDescription() == null ? "" : act.getDescription().trim();
                String notes = "DE:" + saved.getId() + (desc.isBlank() ? "" : " " + desc);
                if (notes.length() > 500) notes = notes.substring(0, 497) + "...";
                attendanceService.saveWorkDay(businessId, employee.getId(), act.getActivityDate(), "EX", notes);
            }
            return;
        }
        Map<LocalDate, List<String>> descByDate = new HashMap<>();
        for (OvertimeActivity act : saved.getActivities()) {
            if (act.getActivityDate() == null) continue;
            descByDate.computeIfAbsent(act.getActivityDate(), k -> new ArrayList<>())
                    .add(act.getDescription() == null ? "" : act.getDescription().trim());
        }
        for (Map.Entry<LocalDate, List<String>> e : descByDate.entrySet()) {
            String joined = e.getValue().stream()
                    .filter(s -> s != null && !s.isBlank())
                    .distinct()
                    .reduce((a, b) -> a + "; " + b)
                    .orElse("Registro de horas/días extra");
            String notes = "HE: " + joined;
            if (notes.length() > 500) notes = notes.substring(0, 497) + "...";
            attendanceService.saveWorkDay(businessId, employee.getId(), e.getKey(), "EX", notes);
        }
    }

    @Transactional
    public OvertimeRequest uploadSignedPdf(Long businessId, Long requestId, MultipartFile file) throws IOException {
        OvertimeRequest req = requestRepo.findById(requestId)
                .filter(r -> r.getBusiness().getId().equals(businessId))
                .orElseThrow(() -> new NoSuchElementException("Request not found"));

        Path dir = Paths.get(storageRoot, "overtime-pdfs").toAbsolutePath().normalize();
        Files.createDirectories(dir);
        String filename = "overtime_" + businessId + "_" + requestId + "_" + System.currentTimeMillis() + ".pdf";
        Path dest = dir.resolve(filename);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

        req.setSignedPdfPath(dest.toString());
        req.setStatus("APROBADO");
        req.setApprovedAt(LocalDateTime.now());

        return requestRepo.save(req);
    }

    @Transactional
    public OvertimeRequest updateStatus(Long businessId, Long requestId, String status) {
        OvertimeRequest req = requestRepo.findById(requestId)
                .filter(r -> r.getBusiness().getId().equals(businessId))
                .orElseThrow(() -> new NoSuchElementException("Request not found"));
        req.setStatus(status);
        if ("APROBADO".equals(status)) req.setApprovedAt(LocalDateTime.now());
        return requestRepo.save(req);
    }

    @Transactional
    public void delete(Long businessId, Long requestId) {
        OvertimeRequest req = requestRepo.findById(requestId)
                .filter(r -> r.getBusiness().getId().equals(businessId))
                .orElseThrow(() -> new NoSuchElementException("Request not found"));
        String kind = req.getEntryKind();
        Long employeeId = req.getEmployee().getId();
        if (req.getActivities() != null) {
            if ("DIA".equals(kind)) {
                String prefix = "DE:" + req.getId();
                for (OvertimeActivity act : req.getActivities()) {
                    if (act.getActivityDate() == null) continue;
                    attendanceService.deleteWorkDayIfNotePrefix(businessId, employeeId, act.getActivityDate(), prefix);
                }
            } else if ("HORA".equals(kind)) {
                LocalDate min = null;
                LocalDate max = null;
                for (OvertimeActivity act : req.getActivities()) {
                    if (act.getActivityDate() == null) continue;
                    if (min == null || act.getActivityDate().isBefore(min)) min = act.getActivityDate();
                    if (max == null || act.getActivityDate().isAfter(max)) max = act.getActivityDate();
                }
                if (min != null && max != null) {
                    String mark = "REQ:" + req.getId();
                    for (EmployeeOvertime ot : overtimeRepo.findByEmployee_IdAndOvertimeDateBetweenOrderByOvertimeDateAsc(employeeId, min, max)) {
                        if (ot.getNotes() != null && ot.getNotes().startsWith(mark)) {
                            overtimeRepo.delete(ot);
                        }
                    }
                }
            }
        }
        requestRepo.delete(req);
    }
}
