package com.improvementsolutions.model.training;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "training_plan_item")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingPlanItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plan_id", nullable = false)
    private Long planId;

    @Column(nullable = false, length = 400)
    private String name;

    @Column(length = 800)
    private String description;

    @Column(name = "activity_type", length = 40)
    private String activityType;

    @Column(name = "facilitator_type", length = 40)
    private String facilitatorType;

    @Column(length = 160)
    private String facilitator;

    @Column(length = 160)
    private String place;

    @Column(name = "evidence_pdf", length = 400)
    private String evidencePdf;

    @Column(name = "evidence_photos", length = 1200)
    private String evidencePhotos;

    @Column(length = 400)
    private String materials;

    /** ALL | SUPERVISORS | DRIVERS | BRIGADE */
    @Column(name = "audience_code", length = 30)
    private String audienceCode;

    @Column(name = "audience_label", length = 120)
    private String audienceLabel;

    /** Meses 1-12 separados por coma, ej. 1,2,12 */
    @Column(name = "months", length = 40)
    private String months;

    @Column(length = 40)
    private String duration;

    @Column(length = 80)
    private String methodology;

    @Column(name = "planned_count")
    private Integer plannedCount;

    @Column(name = "sort_order")
    private Integer sortOrder;

    /** PLANIFICADA | EVENTUAL */
    @Column(nullable = false, length = 20)
    private String origin;
}
