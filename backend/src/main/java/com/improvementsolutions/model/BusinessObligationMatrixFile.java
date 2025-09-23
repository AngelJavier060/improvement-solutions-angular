package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "business_obligation_matrix_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessObligationMatrixFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "business_obligation_matrix_id", nullable = false)
    private BusinessObligationMatrix businessObligationMatrix;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String path;

    @Column(name = "version")
    private Integer version = 1;

    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
