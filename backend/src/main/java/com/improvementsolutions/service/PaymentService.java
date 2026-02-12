package com.improvementsolutions.service;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.BusinessModuleRepository;
import com.improvementsolutions.repository.PaymentRepository;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BusinessModuleRepository businessModuleRepository;
    private final UserRepository userRepository;

    public List<Payment> findAll() {
        return paymentRepository.findAll();
    }

    public Optional<Payment> findById(Long id) {
        return paymentRepository.findById(id);
    }

    public List<Payment> findByBusinessId(Long businessId) {
        return paymentRepository.findByBusinessIdOrderByCreatedAtDesc(businessId);
    }

    public List<Payment> findPending() {
        return paymentRepository.findByPaymentStatusOrderByCreatedAtDesc("PENDIENTE");
    }

    public List<Payment> findByBusinessAndStatus(Long businessId, String status) {
        return paymentRepository.findByBusinessIdAndPaymentStatusOrderByCreatedAtDesc(businessId, status);
    }

    @Transactional
    public Payment create(Payment payment) {
        return paymentRepository.save(payment);
    }

    /**
     * Super Admin confirma un pago y activa automáticamente el módulo asociado.
     */
    @Transactional
    public Payment confirmPayment(Long paymentId, Long confirmedByUserId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Pago no encontrado"));

        if ("CONFIRMADO".equals(payment.getPaymentStatus())) {
            throw new RuntimeException("Este pago ya fue confirmado");
        }

        User confirmedBy = userRepository.findById(confirmedByUserId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        payment.setPaymentStatus("CONFIRMADO");
        payment.setConfirmedBy(confirmedBy);
        payment.setConfirmedAt(LocalDateTime.now());

        // Activar el módulo asociado si existe
        if (payment.getBusinessModule() != null) {
            activateModule(payment.getBusinessModule(), payment.getPlan());
        }

        log.info("Pago {} confirmado por usuario {}", paymentId, confirmedByUserId);
        return paymentRepository.save(payment);
    }

    /**
     * Rechazar un pago pendiente.
     */
    @Transactional
    public Payment rejectPayment(Long paymentId, Long rejectedByUserId, String reason) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Pago no encontrado"));

        payment.setPaymentStatus("RECHAZADO");
        payment.setNotes(reason);

        User rejectedBy = userRepository.findById(rejectedByUserId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        payment.setConfirmedBy(rejectedBy);
        payment.setConfirmedAt(LocalDateTime.now());

        log.info("Pago {} rechazado por usuario {}", paymentId, rejectedByUserId);
        return paymentRepository.save(payment);
    }

    /**
     * Activa un módulo de empresa estableciendo fechas según el plan.
     */
    private void activateModule(BusinessModule bm, SubscriptionPlan plan) {
        bm.setActive(true);
        bm.setStatus("ACTIVO");
        bm.setStartDate(LocalDate.now());

        if (plan != null && plan.getDurationMonths() != null && plan.getDurationMonths() > 0) {
            bm.setExpirationDate(LocalDate.now().plusMonths(plan.getDurationMonths()));
        } else {
            // Plan ilimitado: sin fecha de expiración
            bm.setExpirationDate(null);
        }

        if (plan != null) {
            bm.setPlan(plan);
        }

        businessModuleRepository.save(bm);
        log.info("Módulo {} activado para empresa {} con plan {}",
                bm.getModule().getName(),
                bm.getBusiness().getId(),
                plan != null ? plan.getName() : "sin plan");
    }
}
