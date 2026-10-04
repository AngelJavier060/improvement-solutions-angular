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
        name = "birthday_greeting_mail_sent",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_birthday_mail_sent",
                columnNames = {"employee_id", "sent_date", "slot"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BirthdayGreetingMailSent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "sent_date", nullable = false)
    private LocalDate sentDate;

    /** 1 = 08:00, 2 = 15:00 (America/Guayaquil) */
    @Column(name = "slot", nullable = false)
    private Integer slot;

    @Column(name = "email_to", length = 180)
    private String emailTo;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;
}
