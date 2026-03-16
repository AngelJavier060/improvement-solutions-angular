package com.improvementsolutions.service;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.*;
import lombok.RequiredArgsConstructor;
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
    private final AttendanceService attendanceService;

    private static final String UPLOAD_DIR = "uploads/overtime-pdfs/";

    public List<OvertimeRequest> getByBusiness(Long businessId, String period) {
        if (period != null && !period.isBlank()) {
            return requestRepo.findByBusinessIdAndPeriod(businessId, period);
        }
        return requestRepo.findByBusinessId(businessId);
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

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> activities = (List<Map<String, Object>>) body.get("activities");
        if (activities != null) {
            // Validación: no permitir registrar día extra u horas extra en jornada normal (T)
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
                act.setDescription((String) a.getOrDefault("description", ""));
                act.setSupportDoc((String) a.getOrDefault("supportDoc", ""));
                req.getActivities().add(act);
            }

            // Ejecutar validación contra jornada
            for (LocalDate d : datesToValidate) {
                String type = attendanceService.computeDayType(businessId, employeeId, d);
                if ("T".equalsIgnoreCase(type)) {
                    throw new IllegalArgumentException("No es posible registrar horas/días extra el " + d + ": es un día de jornada laboral normal.");
                }
            }

            // Reflejar automáticamente en planilla: marcar EX y guardar motivo/descripcion
            for (Map.Entry<LocalDate, List<String>> e : descByDate.entrySet()) {
                LocalDate d = e.getKey();
                String joined = e.getValue().stream()
                        .filter(s -> s != null && !s.isBlank())
                        .distinct()
                        .reduce((a, b) -> a + "; " + b)
                        .orElse("Registro de horas/días extra");
                String notes = ("HE: " + joined);
                if (notes.length() > 500) notes = notes.substring(0, 497) + "...";
                attendanceService.saveWorkDay(businessId, employeeId, d, "EX", notes);
            }
        }

        return requestRepo.save(req);
    }

    @Transactional
    public OvertimeRequest uploadSignedPdf(Long businessId, Long requestId, MultipartFile file) throws IOException {
        OvertimeRequest req = requestRepo.findById(requestId)
                .filter(r -> r.getBusiness().getId().equals(businessId))
                .orElseThrow(() -> new NoSuchElementException("Request not found"));

        Path dir = Paths.get(UPLOAD_DIR);
        Files.createDirectories(dir);
        String filename = "overtime_" + businessId + "_" + requestId + "_" + System.currentTimeMillis() + ".pdf";
        Path dest = dir.resolve(filename);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

        req.setSignedPdfPath(UPLOAD_DIR + filename);
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
        requestRepo.delete(req);
    }
}
