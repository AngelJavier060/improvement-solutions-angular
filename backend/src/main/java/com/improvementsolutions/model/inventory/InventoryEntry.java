package com.improvementsolutions.model.inventory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.inventory.enums.EntryStatus;
import com.improvementsolutions.model.inventory.enums.EntryType;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_entries")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    @JsonIgnore
    private Business business;

    @Column(name = "entry_number", nullable = false, length = 50)
    private String entryNumber; // Número de documento: factura, guía

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate; // Fecha de llegada física

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false, length = 30)
    private EntryType entryType; // COMPRA, DEVOLUCION, TRANSFERENCIA, etc.

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "business"})
    private InventorySupplier supplier; // De quién vienen los productos

    @Column(length = 200)
    private String origin; // Origen alternativo: bodega central, trabajador

    @Column(name = "received_by", nullable = false, length = 100)
    private String receivedBy; // Quién recibió físicamente

    @Column(name = "authorized_by", length = 100)
    private String authorizedBy; // Quién autorizó la compra

    @Column(name = "document_image", length = 255)
    private String documentImage; // Foto de factura/guía

    @Column(columnDefinition = "TEXT")
    private String notes; // Observaciones generales

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EntryStatus status = EntryStatus.CONFIRMADO;

    @OneToMany(mappedBy = "entry", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"entry"})
    private List<InventoryEntryDetail> details = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = EntryStatus.CONFIRMADO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Métodos auxiliares para gestión de detalles
    public void addDetail(InventoryEntryDetail detail) {
        details.add(detail);
        detail.setEntry(this);
    }

    public void removeDetail(InventoryEntryDetail detail) {
        details.remove(detail);
        detail.setEntry(null);
    }
}
