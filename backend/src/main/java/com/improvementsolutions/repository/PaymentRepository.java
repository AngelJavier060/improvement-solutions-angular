package com.improvementsolutions.repository;

import com.improvementsolutions.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByBusinessIdOrderByCreatedAtDesc(Long businessId);

    List<Payment> findByBusinessModuleIdOrderByCreatedAtDesc(Long businessModuleId);

    List<Payment> findByPaymentStatusOrderByCreatedAtDesc(String paymentStatus);

    List<Payment> findByBusinessIdAndPaymentStatusOrderByCreatedAtDesc(Long businessId, String paymentStatus);
}
