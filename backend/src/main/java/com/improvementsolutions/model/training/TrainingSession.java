package com.improvementsolutions.model.training;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "training_session")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(length = 160)
    private String place;

    private Integer hours;

    @Column(length = 160)
    private String facilitator;

    @Column(length = 500)
    private String notes;

    @Column(length = 20)
    private String origin;

    @Column(name = "evidence_file", length = 400)
    private String evidenceFile;

    @Column(name = "evidence_photos", length = 1200)
    private String evidencePhotos;

    @Column(name = "created_by", length = 80)
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
