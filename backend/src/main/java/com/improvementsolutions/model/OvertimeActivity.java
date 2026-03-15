package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "overtime_activity")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"request"})
@EqualsAndHashCode(exclude = {"request"})
public class OvertimeActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private OvertimeRequest request;

    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "description", nullable = false, length = 1000)
    private String description;

    @Column(name = "support_doc", length = 300)
    private String supportDoc;

    public double getHoursTotal() {
        if (startTime == null || endTime == null) return 0;
        long minutes = java.time.Duration.between(startTime, endTime).toMinutes();
        return Math.max(0, minutes / 60.0);
    }
}
