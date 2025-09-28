package com.improvementsolutions.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.improvementsolutions.model.ApprovalRequest;
import com.improvementsolutions.service.ApprovalRequestService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/approvals")
@RequiredArgsConstructor
public class ApprovalRequestController {

    private final ApprovalRequestService approvalService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final Logger logger = LoggerFactory.getLogger(ApprovalRequestController.class);

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','USER')")
    public ResponseEntity<ApprovalRequest> create(@RequestBody CreateApprovalDto dto, Authentication auth) {
        String username = auth != null ? auth.getName() : null;
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no autenticado");
        }
        try {
            logger.debug("[Approvals] Creating request: businessId={}, type={}, targetType={}, targetId={}, requester={}",
                    dto.getBusinessId(), dto.getType(), dto.getTargetType(), dto.getTargetId(), username);
            String payloadJson = dto.getPayload() == null ? "{}" : objectMapper.writeValueAsString(dto.getPayload());
            ApprovalRequest req = approvalService.create(
                    dto.getBusinessId(),
                    username,
                    dto.getType(),
                    dto.getTargetType(),
                    dto.getTargetId(),
                    payloadJson
            );
            return ResponseEntity.ok(req);
        } catch (Exception e) {
            String msg = e.getMessage() == null ? "Error interno" : e.getMessage();
            // Clasificar errores conocidos como 400 (bad request)
            if (msg.contains("Empresa no encontrada") || msg.contains("Usuario solicitante no encontrado")) {
                logger.warn("[Approvals] Bad request creating approval: {}", msg);
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, msg, e);
            }
            logger.error("[Approvals] Unexpected error creating approval", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo crear la solicitud", e);
        }
    }

    @GetMapping("/business/{businessId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ApprovalRequest>> listByBusiness(@PathVariable Long businessId,
                                                                @RequestParam(required = false) String status) {
        return ResponseEntity.ok(approvalService.listByBusiness(businessId, status));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApprovalRequest> approve(@PathVariable Long id,
                                                   @RequestBody(required = false) DecisionDto dto,
                                                   Authentication auth) {
        String username = auth != null ? auth.getName() : null;
        if (username == null) throw new RuntimeException("Usuario no autenticado");
        String reason = dto != null ? dto.getReason() : null;
        return ResponseEntity.ok(approvalService.approve(id, username, reason));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApprovalRequest> reject(@PathVariable Long id,
                                                  @RequestBody(required = false) DecisionDto dto,
                                                  Authentication auth) {
        String username = auth != null ? auth.getName() : null;
        if (username == null) throw new RuntimeException("Usuario no autenticado");
        String reason = dto != null ? dto.getReason() : null;
        return ResponseEntity.ok(approvalService.reject(id, username, reason));
    }

    @Data
    public static class CreateApprovalDto {
        private Long businessId;
        private String type; // MATRIX_UPDATE, FILE_UPLOAD, FILE_DELETE
        private String targetType; // BUSINESS_OBLIGATION_MATRIX, MATRIX_FILE
        private Long targetId;
        private Object payload;
    }

    @Data
    public static class DecisionDto {
        private String reason;
    }
}
