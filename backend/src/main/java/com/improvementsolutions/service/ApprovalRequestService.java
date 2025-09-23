package com.improvementsolutions.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.improvementsolutions.model.ApprovalRequest;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.BusinessObligationMatrix;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.ApprovalRequestRepository;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ApprovalRequestService {

    private final ApprovalRequestRepository approvalRepo;
    private final BusinessRepository businessRepo;
    private final UserRepository userRepo;
    private final BusinessObligationMatrixService matrixService;
    private final FileStorageService fileStorageService;
    private final BusinessObligationMatrixFileService matrixFileService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public ApprovalRequest create(Long businessId, String requesterUsername,
                                  String type, String targetType, Long targetId, String payloadJson) {
        Business business = businessRepo.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        User requester = userRepo.findByUsername(requesterUsername)
                .orElseThrow(() -> new RuntimeException("Usuario solicitante no encontrado"));

        ApprovalRequest req = new ApprovalRequest();
        req.setBusiness(business);
        req.setRequester(requester);
        req.setType(type);
        req.setTargetType(targetType);
        req.setTargetId(targetId);
        req.setPayloadJson(payloadJson);
        req.setStatus("PENDING");
        req.setCreatedAt(LocalDateTime.now());
        req.setUpdatedAt(LocalDateTime.now());
        return approvalRepo.save(req);
    }

    public List<ApprovalRequest> listByBusiness(Long businessId, String status) {
        if (status != null && !status.isBlank()) {
            return approvalRepo.findByBusiness_IdAndStatus(businessId, status.toUpperCase());
        }
        return approvalRepo.findByBusiness_Id(businessId);
    }

    @Transactional
    public ApprovalRequest approve(Long id, String adminUsername, String reason) {
        ApprovalRequest req = approvalRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));
        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new RuntimeException("La solicitud ya fue procesada");
        }
        User admin = userRepo.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Usuario aprobador no encontrado"));

        // Aplicar acción según tipo
        applyAction(req);

        req.setStatus("APPROVED");
        req.setDecisionBy(admin);
        req.setDecisionReason(reason);
        req.setDecisionAt(LocalDateTime.now());
        req.setUpdatedAt(LocalDateTime.now());
        return approvalRepo.save(req);
    }

    @Transactional
    public ApprovalRequest reject(Long id, String adminUsername, String reason) {
        ApprovalRequest req = approvalRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Solicitud no encontrada"));
        if (!"PENDING".equalsIgnoreCase(req.getStatus())) {
            throw new RuntimeException("La solicitud ya fue procesada");
        }
        User admin = userRepo.findByUsername(adminUsername)
                .orElseThrow(() -> new RuntimeException("Usuario aprobador no encontrado"));
        req.setStatus("REJECTED");
        req.setDecisionBy(admin);
        req.setDecisionReason(reason);
        req.setDecisionAt(LocalDateTime.now());
        req.setUpdatedAt(LocalDateTime.now());
        return approvalRepo.save(req);
    }

    private void applyAction(ApprovalRequest req) {
        String type = req.getType() == null ? "" : req.getType().toUpperCase();
        String targetType = req.getTargetType() == null ? "" : req.getTargetType().toUpperCase();
        Long targetId = req.getTargetId();
        if ("MATRIX_UPDATE".equals(type) && "BUSINESS_OBLIGATION_MATRIX".equals(targetType)) {
            // Payload esperado: { dueDate: 'yyyy-MM-dd', priority: 'ALTA|MEDIA|BAJA', responsiblePerson: 'Depto/Persona', status: '...' }
            try {
                Map<String, Object> payload = objectMapper.readValue(
                        req.getPayloadJson() == null ? "{}" : req.getPayloadJson(),
                        new TypeReference<Map<String, Object>>() {});
                // Si viene 'completed', procesar a través del método dedicado
                if (payload.containsKey("completed")) {
                    boolean completed = Boolean.parseBoolean(String.valueOf(payload.get("completed")));
                    matrixService.markCompletion(targetId, completed);
                }

                BusinessObligationMatrix partial = new BusinessObligationMatrix();
                if (payload.containsKey("dueDate") && payload.get("dueDate") != null) {
                    String s = String.valueOf(payload.get("dueDate"));
                    partial.setDueDate(LocalDate.parse(s));
                }
                if (payload.containsKey("priority") && payload.get("priority") != null) {
                    partial.setPriority(String.valueOf(payload.get("priority")));
                }
                if (payload.containsKey("responsiblePerson") && payload.get("responsiblePerson") != null) {
                    partial.setResponsiblePerson(String.valueOf(payload.get("responsiblePerson")));
                }
                if (payload.containsKey("status") && payload.get("status") != null) {
                    partial.setStatus(String.valueOf(payload.get("status")));
                }
                // Aplicar actualización parcial solo si hay valores set
                if (partial.getDueDate() != null || partial.getPriority() != null ||
                        partial.getResponsiblePerson() != null || partial.getStatus() != null) {
                    matrixService.update(targetId, partial);
                }
            } catch (Exception e) {
                throw new RuntimeException("No se pudo aplicar la acción sobre la matriz: " + e.getMessage(), e);
            }
        }
        if ("FILE_UPLOAD".equals(type) && "BUSINESS_OBLIGATION_MATRIX".equals(targetType)) {
            try {
                Map<String, Object> payload = objectMapper.readValue(
                        req.getPayloadJson() == null ? "{}" : req.getPayloadJson(),
                        new TypeReference<Map<String, Object>>() {});
                String stagingPath = payload.get("stagingPath") != null ? String.valueOf(payload.get("stagingPath")) : null;
                String originalName = payload.get("originalName") != null ? String.valueOf(payload.get("originalName")) : null;
                String description = payload.get("description") != null ? String.valueOf(payload.get("description")) : null;
                if (stagingPath == null || stagingPath.isBlank()) {
                    throw new RuntimeException("stagingPath es requerido para FILE_UPLOAD");
                }
                BusinessObligationMatrix bom = matrixService.findById(targetId)
                        .orElseThrow(() -> new RuntimeException("Matriz de obligaciones no encontrada"));
                Long businessId = bom.getBusiness() != null ? bom.getBusiness().getId() : null;
                if (businessId == null) {
                    throw new RuntimeException("No se pudo determinar la empresa de la matriz");
                }
                String destSubdir = businessId + "/obligation_matrix";
                String finalRelativePath = fileStorageService.moveFile(stagingPath, destSubdir, null);
                matrixFileService.createFromPath(targetId, finalRelativePath, originalName, description);
            } catch (Exception e) {
                throw new RuntimeException("No se pudo aplicar la aprobación de archivo: " + e.getMessage(), e);
            }
        }
    }
}
