package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "overtime_request")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"business", "employee", "activities"})
@EqualsAndHashCode(exclude = {"business", "employee", "activities"})
public class OvertimeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private BusinessEmployee employee;

    @Column(name = "report_period", nullable = false)
    private String reportPeriod;

    @Column(name = "supervisor_name", length = 200)
    private String supervisorName;

    @Column(name = "department", length = 200)
    private String department;

    @Column(name = "area", length = 200)
    private String area;

    @Column(name = "recognition_type", length = 100)
    private String recognitionType;

    @Column(name = "status", nullable = false, length = 50)
    private String status = "PENDIENTE";

    @Column(name = "signed_pdf_path", length = 500)
    private String signedPdfPath;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("activityDate ASC")
    private List<OvertimeActivity> activities = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
