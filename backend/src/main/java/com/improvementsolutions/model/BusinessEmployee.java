package com.improvementsolutions.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "business_employees")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"business", "gender", "civilStatus", "etnia", "degree", "positionEntity", "department", "typeContract", "employee", "contractorCompany", "contractorBlock"})
@EqualsAndHashCode(exclude = {"business", "gender", "civilStatus", "etnia", "degree", "positionEntity", "department", "typeContract", "employee", "contractorCompany", "contractorBlock"})
public class BusinessEmployee {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String cedula;
    
    @Column(name = "apellidos")
    private String apellidos;
    
    @Column(name = "nombres") 
    private String nombres;
    
    @Column(name = "name")
    private String name;
    
    @Column(name = "codigo_empresa")
    private String codigoEmpresa;
    
    private String phone;
    private String email;
    
    @Column(name = "date_birth")
    private LocalDateTime dateBirth;
    
    @Column(name = "lugar_nacimiento_provincia")
    private String lugarNacimientoProvincia;
    
    @Column(name = "lugar_nacimiento_ciudad")
    private String lugarNacimientoCiudad;
    
    @Column(name = "lugar_nacimiento_parroquia")
    private String lugarNacimientoParroquia;
    
    private String address;
    
    @Column(name = "direccion_domiciliaria")
    private String direccionDomiciliaria;
    
    @Column(name = "resident_address")
    private String residentAddress;
    
    @Column(name = "fecha_ingreso")
    private LocalDate fechaIngreso;
    
    private String position;
    
    @Column(name = "contact_name")
    private String contactName;
    
    @Column(name = "contact_phone")
    private String contactPhone;
    
    @Column(name = "contact_kinship")
    private String contactKinship;
    
    @Column(name = "tipo_sangre")
    private String tipoSangre;
    
    private Double salario; // Agregado campo salario
    
    private String iess;
    
    @Column(name = "codigo_iess")
    private String codigoIess;
    
    @Column(name = "nivel_educacion")
    private String nivelEducacion;
    
    private String discapacidad;
    
    private Boolean active = true;
    private String status = "ACTIVO";
    
    @Column(name = "image_path")
    private String imagePath;
    
    private String image;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id")
    private Business business;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gender_id")
    private Gender gender;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "civil_status_id")
    private CivilStatus civilStatus;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "etnia_id")
    private Etnia etnia;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "degree_id")
    private Degree degree;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id")
    private Position positionEntity;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private Department department;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "type_contract_id")
    private TypeContract typeContract;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;
    
    // Nuevos campos para empresa contratista y bloque
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contractor_company_id")
    private ContractorCompany contractorCompany;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contractor_block_id")
    private ContractorBlock contractorBlock;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.active == null) {
            this.active = true;
        }
        if (this.status == null) {
            this.status = "ACTIVO";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public String getFullName() {
        if (apellidos != null && nombres != null) {
            return apellidos + " " + nombres;
        }
        return name != null ? name : "";
    }
}