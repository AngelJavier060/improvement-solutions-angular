package com.improvementsolutions.model.inventory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.enums.OutputStatus;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_outputs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryOutput {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(name = "output_number", nullable = false, unique = true, length = 50)
    private String outputNumber;

    @Column(name = "output_date", nullable = false)
    private LocalDate outputDate = LocalDate.now();

    @Column(name = "output_type", nullable = false, length = 80)
    private String outputType; // Nombre/código del catálogo (ej. EPP_TRABAJADOR o etiqueta)

    @Column(name = "employee_id")
    private Long employeeId;

    @Column(length = 100)
    private String area;

    @Column(length = 100)
    private String project;

    @Column(name = "return_date")
    private LocalDate returnDate;

    /** true cuando el préstamo ya fue devuelto (deja de aparecer como activo). */
    @Column(name = "returned")
    private Boolean returned = false;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt;

    /** Entrada de tipo DEVOLUCION que cerró el préstamo (opcional). */
    @Column(name = "return_entry_id")
    private Long returnEntryId;

    @Column(name = "authorized_by", length = 100)
    private String authorizedBy;

    @Column(name = "document_image", length = 255)
    private String documentImage;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OutputStatus status = OutputStatus.BORRADOR;

    @OneToMany(mappedBy = "output", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<InventoryOutputDetail> details = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.outputDate == null) this.outputDate = LocalDate.now();
        if (this.status == null) this.status = OutputStatus.BORRADOR;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
