package com.improvementsolutions.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "business_employee_document_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessEmployeeDocumentFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private BusinessEmployeeDocument document;

    // Compatibilidad con esquemas donde existe una columna legacy adicional
    // 'business_employee_document_id' marcada como NOT NULL. La poblamos con el id del documento asociado.
    @Column(name = "business_employee_document_id")
    private Long businessEmployeeDocumentId;

    @Column(name = "file_path", nullable = false, length = 512)
    private String filePath;

    // Compatibilidad con esquemas antiguos donde existe la columna 'file' NOT NULL
    // Si la base de datos tiene esta columna, la llenamos con el mismo valor que filePath
    @Column(name = "file", length = 512)
    private String file;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_type", length = 100)
    private String fileType;

    // Compatibilidad con esquemas donde existe la columna 'name' como NOT NULL
    // Guardaremos aquí el nombre legible del archivo (por defecto el originalFilename)
    @Column(name = "name", length = 255)
    private String name;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    // Campo active requerido por la BD de producción
    @Column(name = "active")
    private Boolean active = true;

    @PrePersist
    protected void onCreate() {
        this.uploadedAt = LocalDateTime.now();
        if (this.active == null) {
            this.active = true;
        }
        if (this.file == null) {
            this.file = this.filePath;
        }
        if (this.businessEmployeeDocumentId == null && this.document != null) {
            this.businessEmployeeDocumentId = this.document.getId();
        }
        if (this.name == null || this.name.isBlank()) {
            String n = this.fileName;
            if (n == null || n.isBlank()) {
                n = this.filePath;
                if (n != null) {
                    int idx = n.lastIndexOf('/');
                    if (idx >= 0 && idx < n.length() - 1) {
                        n = n.substring(idx + 1);
                    }
                }
            }
            if (n == null || n.isBlank()) {
                n = "document-file";
            }
            this.name = n;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        if (this.active == null) {
            this.active = true;
        }
        if (this.file == null) {
            this.file = this.filePath;
        }
        if (this.businessEmployeeDocumentId == null && this.document != null) {
            this.businessEmployeeDocumentId = this.document.getId();
        }
        if (this.name == null || this.name.isBlank()) {
            String n = this.fileName;
            if (n == null || n.isBlank()) {
                n = this.filePath;
                if (n != null) {
                    int idx = n.lastIndexOf('/');
                    if (idx >= 0 && idx < n.length() - 1) {
                        n = n.substring(idx + 1);
                    }
                }
            }
            if (n == null || n.isBlank()) {
                n = "document-file";
            }
            this.name = n;
        }
    }
}
