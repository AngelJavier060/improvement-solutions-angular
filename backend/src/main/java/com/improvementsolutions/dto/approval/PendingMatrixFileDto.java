package com.improvementsolutions.dto.approval;

import java.time.LocalDateTime;

public class PendingMatrixFileDto {
    private Long approvalRequestId;
    private String originalName;
    private String stagingPath;
    private String description;
    private String requesterUsername;
    private LocalDateTime createdAt;

    public Long getApprovalRequestId() { return approvalRequestId; }
    public void setApprovalRequestId(Long approvalRequestId) { this.approvalRequestId = approvalRequestId; }

    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }

    public String getStagingPath() { return stagingPath; }
    public void setStagingPath(String stagingPath) { this.stagingPath = stagingPath; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRequesterUsername() { return requesterUsername; }
    public void setRequesterUsername(String requesterUsername) { this.requesterUsername = requesterUsername; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
