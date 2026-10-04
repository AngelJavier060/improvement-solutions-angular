package com.improvementsolutions.model.training;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "training_attendance",
        uniqueConstraints = @UniqueConstraint(name = "uk_training_att_session_emp", columnNames = {"session_id", "employee_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(nullable = false)
    private Boolean present;

    @Column(length = 40)
    private String score;
}
