package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "approval_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne
    @JoinColumn(name = "requester_user_id", nullable = false)
    private User requester;

    // e.g., MATRIX_UPDATE, FILE_UPLOAD, FILE_DELETE
    @Column(name = "request_type", nullable = false)
    private String type;

    // e.g., BUSINESS_OBLIGATION_MATRIX, MATRIX_FILE
    @Column(name = "target_type", nullable = false)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Lob
    @Column(name = "payload_json")
    private String payloadJson;

    // PENDING, APPROVED, REJECTED
    @Column(nullable = false)
    private String status = "PENDING";

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "decision_at")
    private LocalDateTime decisionAt;

    @ManyToOne
    @JoinColumn(name = "decision_by_user_id")
    private User decisionBy;

    @Column(name = "decision_reason")
    private String decisionReason;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
