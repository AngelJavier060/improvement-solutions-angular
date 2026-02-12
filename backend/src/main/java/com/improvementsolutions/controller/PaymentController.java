package com.improvementsolutions.controller;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.BusinessModuleRepository;
import com.improvementsolutions.repository.SubscriptionPlanRepository;
import com.improvementsolutions.service.BusinessService;
import com.improvementsolutions.service.PaymentService;
import com.improvementsolutions.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final BusinessService businessService;
    private final BusinessModuleRepository businessModuleRepository;
    private final SubscriptionPlanRepository subscriptionPlanRepository;
    private final UserService userService;

    /**
     * Lista todos los pagos (Super Admin) o por empresa (Admin)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<Payment>> getAll(
            @RequestParam(required = false) Long businessId,
            @RequestParam(required = false) String status) {
        if (businessId != null && status != null) {
            return ResponseEntity.ok(paymentService.findByBusinessAndStatus(businessId, status));
        }
        if (businessId != null) {
            return ResponseEntity.ok(paymentService.findByBusinessId(businessId));
        }
        if (status != null) {
            if ("PENDIENTE".equals(status)) {
                return ResponseEntity.ok(paymentService.findPending());
            }
        }
        return ResponseEntity.ok(paymentService.findAll());
    }

    /**
     * Obtiene un pago por ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Payment> getById(@PathVariable Long id) {
        return paymentService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Registra un nuevo pago (Admin de empresa solicita pago para un módulo)
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> payload) {
        try {
            Long businessId = Long.valueOf(payload.get("businessId").toString());
            Long businessModuleId = payload.get("businessModuleId") != null
                    ? Long.valueOf(payload.get("businessModuleId").toString()) : null;
            Long planId = payload.get("planId") != null
                    ? Long.valueOf(payload.get("planId").toString()) : null;
            BigDecimal amount = new BigDecimal(payload.get("amount").toString());
            String paymentMethod = payload.getOrDefault("paymentMethod", "TRANSFERENCIA").toString();
            String referenceNumber = payload.get("referenceNumber") != null
                    ? payload.get("referenceNumber").toString() : null;
            String notes = payload.get("notes") != null ? payload.get("notes").toString() : null;

            Business business = businessService.findById(businessId)
                    .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

            Payment payment = Payment.builder()
                    .business(business)
                    .amount(amount)
                    .currency("USD")
                    .paymentMethod(paymentMethod)
                    .paymentStatus("PENDIENTE")
                    .paymentDate(LocalDateTime.now())
                    .referenceNumber(referenceNumber)
                    .notes(notes)
                    .build();

            if (businessModuleId != null) {
                BusinessModule bm = businessModuleRepository.findById(businessModuleId)
                        .orElseThrow(() -> new RuntimeException("Módulo de empresa no encontrado"));
                payment.setBusinessModule(bm);
            }

            if (planId != null) {
                SubscriptionPlan plan = subscriptionPlanRepository.findById(planId)
                        .orElseThrow(() -> new RuntimeException("Plan no encontrado"));
                payment.setPlan(plan);
            }

            Payment saved = paymentService.create(payment);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Super Admin confirma un pago pendiente → activa módulo automáticamente
     */
    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> confirmPayment(@PathVariable Long id, Authentication authentication) {
        try {
            String username = authentication.getName();
            User confirmer = userService.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            Payment confirmed = paymentService.confirmPayment(id, confirmer.getId());
            return ResponseEntity.ok(confirmed);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Super Admin rechaza un pago pendiente
     */
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> rejectPayment(@PathVariable Long id,
                                           @RequestBody Map<String, String> payload,
                                           Authentication authentication) {
        try {
            String reason = payload.getOrDefault("reason", "Rechazado por el administrador");
            String username = authentication.getName();
            User rejector = userService.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

            Payment rejected = paymentService.rejectPayment(id, rejector.getId(), reason);
            return ResponseEntity.ok(rejected);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
