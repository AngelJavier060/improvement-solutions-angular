package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "expiry_alert_sent",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_expiry_alert_sent",
                columnNames = {"business_id", "source_type", "source_id", "threshold_days"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpiryAlertSent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(name = "source_type", nullable = false, length = 40)
    private String sourceType;

    @Column(name = "source_id", nullable = false)
    private Long sourceId;

    @Column(name = "threshold_days", nullable = false)
    private Integer thresholdDays;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;
}
