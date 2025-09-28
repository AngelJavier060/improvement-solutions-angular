package com.improvementsolutions.dto.approval;

import java.time.LocalDateTime;

public class ApprovalRequestDto {
    private Long id;
    private Long businessId;
    private Long requesterUserId;
    private String requesterUsername;
    private String type;
    private String targetType;
    private Long targetId;
    private String status;
    private String payloadJson;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime decisionAt;
    private Long decisionByUserId;
    private String decisionByUsername;
    private String decisionReason;

    public ApprovalRequestDto() {}

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBusinessId() { return businessId; }
    public void setBusinessId(Long businessId) { this.businessId = businessId; }

    public Long getRequesterUserId() { return requesterUserId; }
    public void setRequesterUserId(Long requesterUserId) { this.requesterUserId = requesterUserId; }

    public String getRequesterUsername() { return requesterUsername; }
    public void setRequesterUsername(String requesterUsername) { this.requesterUsername = requesterUsername; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPayloadJson() { return payloadJson; }
    public void setPayloadJson(String payloadJson) { this.payloadJson = payloadJson; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getDecisionAt() { return decisionAt; }
    public void setDecisionAt(LocalDateTime decisionAt) { this.decisionAt = decisionAt; }

    public Long getDecisionByUserId() { return decisionByUserId; }
    public void setDecisionByUserId(Long decisionByUserId) { this.decisionByUserId = decisionByUserId; }

    public String getDecisionByUsername() { return decisionByUsername; }
    public void setDecisionByUsername(String decisionByUsername) { this.decisionByUsername = decisionByUsername; }

    public String getDecisionReason() { return decisionReason; }
    public void setDecisionReason(String decisionReason) { this.decisionReason = decisionReason; }
}
