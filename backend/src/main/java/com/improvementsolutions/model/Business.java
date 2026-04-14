package com.improvementsolutions.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;

@Entity
@Table(name = "businesses")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = {"users", "employees", "positions", "typeContracts", "typeDocuments", "departments", "iessItems", "businessObligationMatrices", "contractorCompanies", "contractorBlocks", "courseCertifications", "cards", "workSchedules", "workShifts", "tipoVehiculos", "estadoUnidades", "marcaVehiculos", "claseVehiculos", "entidadRemitentes", "tipoCombustibles", "colorVehiculos", "transmisiones", "propietarioVehiculos", "tipoDocumentoVehiculos", "unidadMedidas", "ubicacionRutas", "paisOrigenes", "numeroEjes", "configuracionEjes", "distanciaRecorrers", "tipoVias", "condicionClimaticas", "horarioCirculaciones", "estadoCarreteras", "tipoCargas", "horaConducciones", "horaDescansos", "medioComunicaciones", "transportaPasajeros", "metodologiaRiesgos", "posiblesRiesgosVia", "otrosPeligrosViajeCatalogo", "medidasControlTomadasViajeCatalogo"})
@ToString(exclude = {"users", "employees", "positions", "typeContracts", "typeDocuments", "departments", "iessItems", "businessObligationMatrices", "contractorCompanies", "contractorBlocks", "courseCertifications", "cards", "workSchedules", "workShifts", "tipoVehiculos", "estadoUnidades", "marcaVehiculos", "claseVehiculos", "entidadRemitentes", "tipoCombustibles", "colorVehiculos", "transmisiones", "propietarioVehiculos", "tipoDocumentoVehiculos", "unidadMedidas", "ubicacionRutas", "paisOrigenes", "numeroEjes", "configuracionEjes", "distanciaRecorrers", "tipoVias", "condicionClimaticas", "horarioCirculaciones", "estadoCarreteras", "tipoCargas", "horaConducciones", "horaDescansos", "medioComunicaciones", "transportaPasajeros", "metodologiaRiesgos", "posiblesRiesgosVia", "otrosPeligrosViajeCatalogo", "medidasControlTomadasViajeCatalogo"})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Business {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(name = "name_short")
    private String nameShort;
    
    @Column(nullable = false, unique = true)
    private String ruc;
    
    @Column(nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String phone;
    
    @Column(name = "secondary_phone")
    private String secondaryPhone;
    
    private String address;
    private String website;
    private String description;
    
    @Column(name = "commercial_activity")
    private String commercialActivity;
    
    @Column(name = "trade_name")
    private String tradeName;
    
    @Column(name = "legal_representative", nullable = false)
    private String legalRepresentative;
    
    private String logo;
    
    private boolean active = true;
    
    @Column(name = "registration_date")
    private LocalDateTime registrationDate;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnore
    private User createdBy;

    @OneToMany(mappedBy = "business", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<BusinessEmployee> employees = new ArrayList<>();
    
    @ManyToMany(mappedBy = "businesses", fetch = FetchType.LAZY)
    @JsonIgnore
    private Set<User> users = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_position",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "position_id")
    )
    @JsonIgnore
    private Set<Position> positions = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_type_contract",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "type_contract_id")
    )
    @JsonIgnore
    private Set<TypeContract> typeContracts = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_type_document",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "type_document_id")
    )
    @JsonIgnore
    private Set<TypeDocument> typeDocuments = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_department",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "department_id")
    )
    @JsonIgnore
    private Set<Department> departments = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_course_certification",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "course_certification_id")
    )
    @JsonIgnore
    private Set<CourseCertification> courseCertifications = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_card",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "card_id")
    )
    @JsonIgnore
    private Set<CardCatalog> cards = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_work_schedule",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "work_schedule_id")
    )
    @JsonIgnore
    private Set<WorkSchedule> workSchedules = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_work_shift",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "work_shift_id")
    )
    @JsonIgnore
    private Set<WorkShift> workShifts = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_iess",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "iess_id")
    )
    @JsonIgnore
    private Set<Iess> iessItems = new HashSet<>();

    @OneToMany(mappedBy = "business", cascade = CascadeType.ALL, orphanRemoval = true)
    @Where(clause = "active = true")
    @JsonIgnore
    private List<BusinessObligationMatrix> businessObligationMatrices = new ArrayList<>();

    // Relaciones con empresas contratistas
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_contractor_companies",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "contractor_company_id")
    )
    @JsonIgnore
    private List<ContractorCompany> contractorCompanies = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_contractor_blocks",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "contractor_block_id")
    )
    @JsonIgnore
    private List<ContractorBlock> contractorBlocks = new ArrayList<>();

    @Column(name = "qr_legal_docs_token_version")
    private Integer qrLegalDocsTokenVersion;

    // Configuración de Mantenimiento Automotriz por empresa (JSON string)
    @Column(name = "maintenance_config", columnDefinition = "TEXT")
    private String maintenanceConfig;

    // Contactos de emergencia por empresa (JSON string de una lista de objetos {area, phone})
    @Column(name = "emergency_contacts", columnDefinition = "TEXT")
    private String emergencyContacts;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_tipo_vehiculo",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "tipo_vehiculo_id")
    )
    @JsonIgnore
    private Set<TipoVehiculo> tipoVehiculos = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_estado_unidad",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "estado_unidad_id")
    )
    @JsonIgnore
    private Set<EstadoUnidad> estadoUnidades = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_marca_vehiculo",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "marca_vehiculo_id")
    )
    @JsonIgnore
    private Set<MarcaVehiculo> marcaVehiculos = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_clase_vehiculo",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "clase_vehiculo_id")
    )
    @JsonIgnore
    private Set<ClaseVehiculo> claseVehiculos = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_entidad_remitente",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "entidad_remitente_id")
    )
    @JsonIgnore
    private Set<EntidadRemitente> entidadRemitentes = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_tipo_combustible",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "tipo_combustible_id")
    )
    @JsonIgnore
    private Set<TipoCombustible> tipoCombustibles = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_color_vehiculo",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "color_vehiculo_id")
    )
    @JsonIgnore
    private Set<ColorVehiculo> colorVehiculos = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_transmision",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "transmision_id")
    )
    @JsonIgnore
    private Set<Transmision> transmisiones = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_propietario_vehiculo",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "propietario_vehiculo_id")
    )
    @JsonIgnore
    private Set<PropietarioVehiculo> propietarioVehiculos = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_tipo_documento_vehiculo",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "tipo_documento_vehiculo_id")
    )
    @JsonIgnore
    private Set<TipoDocumentoVehiculo> tipoDocumentoVehiculos = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_unidad_medida",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "unidad_medida_id")
    )
    @JsonIgnore
    private Set<UnidadMedida> unidadMedidas = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_ubicacion_ruta",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "ubicacion_ruta_id")
    )
    @JsonIgnore
    private Set<UbicacionRuta> ubicacionRutas = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_pais_origen",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "pais_origen_id")
    )
    @JsonIgnore
    private Set<PaisOrigen> paisOrigenes = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_numero_eje",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "numero_eje_id")
    )
    @JsonIgnore
    private Set<NumeroEje> numeroEjes = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "business_configuracion_eje",
        joinColumns = @JoinColumn(name = "business_id"),
        inverseJoinColumns = @JoinColumn(name = "configuracion_eje_id")
    )
    @JsonIgnore
    private Set<ConfiguracionEje> configuracionEjes = new HashSet<>();

    // === GERENCIA DE VIAJES — parámetros por empresa ===
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_distancia_recorrer", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "distancia_recorrer_id"))
    @JsonIgnore
    private Set<DistanciaRecorrer> distanciaRecorrers = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_tipo_via", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "tipo_via_id"))
    @JsonIgnore
    private Set<TipoVia> tipoVias = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_condicion_climatica", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "condicion_climatica_id"))
    @JsonIgnore
    private Set<CondicionClimatica> condicionClimaticas = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_horario_circulacion", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "horario_circulacion_id"))
    @JsonIgnore
    private Set<HorarioCirculacion> horarioCirculaciones = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_estado_carretera", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "estado_carretera_id"))
    @JsonIgnore
    private Set<EstadoCarretera> estadoCarreteras = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_tipo_carga", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "tipo_carga_id"))
    @JsonIgnore
    private Set<TipoCarga> tipoCargas = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_hora_conduccion", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "hora_conduccion_id"))
    @JsonIgnore
    private Set<HoraConduccion> horaConducciones = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_hora_descanso", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "hora_descanso_id"))
    @JsonIgnore
    private Set<HoraDescanso> horaDescansos = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_medio_comunicacion", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "medio_comunicacion_id"))
    @JsonIgnore
    private Set<MedioComunicacion> medioComunicaciones = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_transporta_pasajero", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "transporta_pasajero_id"))
    @JsonIgnore
    private Set<TransportaPasajero> transportaPasajeros = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_metodologia_riesgo", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "metodologia_riesgo_id"))
    @JsonIgnore
    private Set<MetodologiaRiesgo> metodologiaRiesgos = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_posible_riesgo_via", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "posible_riesgo_via_id"))
    @JsonIgnore
    private Set<PosibleRiesgoVia> posiblesRiesgosVia = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_otros_peligros_viaje", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "otros_peligros_viaje_id"))
    @JsonIgnore
    private Set<OtrosPeligrosViaje> otrosPeligrosViajeCatalogo = new HashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "business_medida_control_tomada_viaje", joinColumns = @JoinColumn(name = "business_id"), inverseJoinColumns = @JoinColumn(name = "medida_control_tomada_viaje_id"))
    @JsonIgnore
    private Set<MedidaControlTomadaViaje> medidasControlTomadasViajeCatalogo = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.registrationDate == null) {
            this.registrationDate = LocalDateTime.now();
        }
        if (this.nameShort == null || this.nameShort.trim().isEmpty()) {
            this.nameShort = this.name.substring(0, Math.min(this.name.length(), 50));
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addEmployee(BusinessEmployee employee) {
        employees.add(employee);
        employee.setBusiness(this);
    }

    public void removeEmployee(BusinessEmployee employee) {
        employees.remove(employee);
        employee.setBusiness(null);
    }

    public void addDepartment(Department department) {
        departments.add(department);
        department.getBusinesses().add(this);
    }

    public void removeDepartment(Department department) {
        departments.remove(department);
        department.getBusinesses().remove(this);
    }

    public void addTypeContract(TypeContract typeContract) {
        typeContracts.add(typeContract);
        typeContract.getBusinesses().add(this);
    }

    public void removeTypeContract(TypeContract typeContract) {
        typeContracts.remove(typeContract);
        typeContract.getBusinesses().remove(this);
    }

    public void addTypeDocument(TypeDocument typeDocument) {
        typeDocuments.add(typeDocument);
        typeDocument.getBusinesses().add(this);
    }

    public void removeTypeDocument(TypeDocument typeDocument) {
        typeDocuments.remove(typeDocument);
        typeDocument.getBusinesses().remove(this);
    }

    public void addIessItem(Iess iessItem) {
        iessItems.add(iessItem);
        iessItem.getBusinesses().add(this);
    }

    public void removeIessItem(Iess iessItem) {
        iessItems.remove(iessItem);
        iessItem.getBusinesses().remove(this);
    }

    public void addPosition(Position position) {
        positions.add(position);
        position.getBusinesses().add(this);
    }

    public void removePosition(Position position) {
        positions.remove(position);
        position.getBusinesses().remove(this);
    }

    public void addBusinessObligationMatrix(BusinessObligationMatrix businessObligationMatrix) {
        businessObligationMatrices.add(businessObligationMatrix);
        businessObligationMatrix.setBusiness(this);
    }

    public void removeBusinessObligationMatrix(BusinessObligationMatrix businessObligationMatrix) {
        businessObligationMatrices.remove(businessObligationMatrix);
        businessObligationMatrix.setBusiness(null);
    }

    // Métodos para empresas contratistas
    public void addContractorBlock(ContractorBlock contractorBlock) {
        if (contractorBlocks == null) {
            contractorBlocks = new ArrayList<>();
        }
        contractorBlocks.add(contractorBlock);
    }

    public void removeContractorBlock(ContractorBlock contractorBlock) {
        if (contractorBlocks != null) {
            contractorBlocks.remove(contractorBlock);
        }
    }

    public void setContractorBlocks(List<ContractorBlock> contractorBlocks) {
        this.contractorBlocks = contractorBlocks != null ? contractorBlocks : new ArrayList<>();
    }
    
    // Métodos para empresas contratistas múltiples
    public void addContractorCompany(ContractorCompany contractorCompany) {
        if (contractorCompanies == null) {
            contractorCompanies = new ArrayList<>();
        }
        if (!contractorCompanies.contains(contractorCompany)) {
            contractorCompanies.add(contractorCompany);
        }
    }

    public void removeContractorCompany(ContractorCompany contractorCompany) {
        if (contractorCompanies != null) {
            contractorCompanies.remove(contractorCompany);
        }
    }

    public void setContractorCompanies(List<ContractorCompany> contractorCompanies) {
        this.contractorCompanies = contractorCompanies != null ? contractorCompanies : new ArrayList<>();
    }
    
    // Métodos de compatibilidad hacia atrás para contractorCompany (singular)
    @JsonIgnore
    @Transient
    public ContractorCompany getContractorCompany() {
        return (contractorCompanies != null && !contractorCompanies.isEmpty()) 
            ? contractorCompanies.get(0) 
            : null;
    }
    
    @JsonIgnore
    @Transient  
    public void setContractorCompany(ContractorCompany contractorCompany) {
        if (contractorCompanies == null) {
            contractorCompanies = new ArrayList<>();
        } else {
            contractorCompanies.clear();
        }
        if (contractorCompany != null) {
            contractorCompanies.add(contractorCompany);
        }
    }

    // Nuevos helpers para catálogos por empresa
    public void addCourseCertification(CourseCertification cc) {
        courseCertifications.add(cc);
    }

    public void removeCourseCertification(CourseCertification cc) {
        courseCertifications.remove(cc);
    }

    public void addCard(CardCatalog card) {
        cards.add(card);
    }

    public void removeCard(CardCatalog card) {
        cards.remove(card);
    }

    // Métodos para jornadas de trabajo
    public void addWorkSchedule(WorkSchedule ws) {
        workSchedules.add(ws);
    }

    public void removeWorkSchedule(WorkSchedule ws) {
        workSchedules.remove(ws);
    }

    // Métodos para horarios de trabajo
    public void addWorkShift(WorkShift wsh) {
        workShifts.add(wsh);
    }

    public void removeWorkShift(WorkShift wsh) {
        workShifts.remove(wsh);
    }

    // Métodos para tipos de vehículo
    public void addTipoVehiculo(TipoVehiculo tv) {
        tipoVehiculos.add(tv);
    }

    public void removeTipoVehiculo(TipoVehiculo tv) {
        tipoVehiculos.remove(tv);
    }

    // Métodos para estados de unidad
    public void addEstadoUnidad(EstadoUnidad eu) {
        estadoUnidades.add(eu);
    }

    public void removeEstadoUnidad(EstadoUnidad eu) {
        estadoUnidades.remove(eu);
    }

    public void addMarcaVehiculo(MarcaVehiculo m) { marcaVehiculos.add(m); }
    public void removeMarcaVehiculo(MarcaVehiculo m) { marcaVehiculos.remove(m); }

    public void addClaseVehiculo(ClaseVehiculo c) { claseVehiculos.add(c); }
    public void removeClaseVehiculo(ClaseVehiculo c) { claseVehiculos.remove(c); }

    public void addEntidadRemitente(EntidadRemitente e) { entidadRemitentes.add(e); }
    public void removeEntidadRemitente(EntidadRemitente e) { entidadRemitentes.remove(e); }

    public void addTipoCombustible(TipoCombustible t) { tipoCombustibles.add(t); }
    public void removeTipoCombustible(TipoCombustible t) { tipoCombustibles.remove(t); }

    public void addColorVehiculo(ColorVehiculo c) { colorVehiculos.add(c); }
    public void removeColorVehiculo(ColorVehiculo c) { colorVehiculos.remove(c); }

    public void addTransmision(Transmision t) { transmisiones.add(t); }
    public void removeTransmision(Transmision t) { transmisiones.remove(t); }

    public void addPropietarioVehiculo(PropietarioVehiculo p) { propietarioVehiculos.add(p); }
    public void removePropietarioVehiculo(PropietarioVehiculo p) { propietarioVehiculos.remove(p); }

    public void addTipoDocumentoVehiculo(TipoDocumentoVehiculo t) { tipoDocumentoVehiculos.add(t); }
    public void removeTipoDocumentoVehiculo(TipoDocumentoVehiculo t) { tipoDocumentoVehiculos.remove(t); }

    public void addUnidadMedida(UnidadMedida u) { unidadMedidas.add(u); }
    public void removeUnidadMedida(UnidadMedida u) { unidadMedidas.remove(u); }

    public void addUbicacionRuta(UbicacionRuta u) { ubicacionRutas.add(u); }
    public void removeUbicacionRuta(UbicacionRuta u) { ubicacionRutas.remove(u); }

    public void addPaisOrigen(PaisOrigen p) { paisOrigenes.add(p); }
    public void removePaisOrigen(PaisOrigen p) { paisOrigenes.remove(p); }

    public void addNumeroEje(NumeroEje n) { numeroEjes.add(n); }
    public void removeNumeroEje(NumeroEje n) { numeroEjes.remove(n); }

    public void addConfiguracionEje(ConfiguracionEje c) { configuracionEjes.add(c); }
    public void removeConfiguracionEje(ConfiguracionEje c) { configuracionEjes.remove(c); }

    // === Gerencia de Viajes helpers ===
    public void addDistanciaRecorrer(DistanciaRecorrer d) { distanciaRecorrers.add(d); }
    public void removeDistanciaRecorrer(DistanciaRecorrer d) { distanciaRecorrers.remove(d); }

    public void addTipoVia(TipoVia t) { tipoVias.add(t); }
    public void removeTipoVia(TipoVia t) { tipoVias.remove(t); }

    public void addCondicionClimatica(CondicionClimatica c) { condicionClimaticas.add(c); }
    public void removeCondicionClimatica(CondicionClimatica c) { condicionClimaticas.remove(c); }

    public void addHorarioCirculacion(HorarioCirculacion h) { horarioCirculaciones.add(h); }
    public void removeHorarioCirculacion(HorarioCirculacion h) { horarioCirculaciones.remove(h); }

    public void addEstadoCarretera(EstadoCarretera e) { estadoCarreteras.add(e); }
    public void removeEstadoCarretera(EstadoCarretera e) { estadoCarreteras.remove(e); }

    public void addTipoCarga(TipoCarga t) { tipoCargas.add(t); }
    public void removeTipoCarga(TipoCarga t) { tipoCargas.remove(t); }

    public void addHoraConduccion(HoraConduccion h) { horaConducciones.add(h); }
    public void removeHoraConduccion(HoraConduccion h) { horaConducciones.remove(h); }

    public void addHoraDescanso(HoraDescanso h) { horaDescansos.add(h); }
    public void removeHoraDescanso(HoraDescanso h) { horaDescansos.remove(h); }

    public void addMedioComunicacion(MedioComunicacion m) { medioComunicaciones.add(m); }
    public void removeMedioComunicacion(MedioComunicacion m) { medioComunicaciones.remove(m); }

    public void addTransportaPasajero(TransportaPasajero t) { transportaPasajeros.add(t); }
    public void removeTransportaPasajero(TransportaPasajero t) { transportaPasajeros.remove(t); }

    public void addMetodologiaRiesgo(MetodologiaRiesgo m) { metodologiaRiesgos.add(m); }
    public void removeMetodologiaRiesgo(MetodologiaRiesgo m) { metodologiaRiesgos.remove(m); }

    public void addPosibleRiesgoVia(PosibleRiesgoVia p) { posiblesRiesgosVia.add(p); }
    public void removePosibleRiesgoVia(PosibleRiesgoVia p) { posiblesRiesgosVia.remove(p); }

    public void addOtrosPeligrosViaje(OtrosPeligrosViaje o) { otrosPeligrosViajeCatalogo.add(o); }
    public void removeOtrosPeligrosViaje(OtrosPeligrosViaje o) { otrosPeligrosViajeCatalogo.remove(o); }

    public void addMedidaControlTomadaViaje(MedidaControlTomadaViaje m) { medidasControlTomadasViajeCatalogo.add(m); }
    public void removeMedidaControlTomadaViaje(MedidaControlTomadaViaje m) { medidasControlTomadasViajeCatalogo.remove(m); }
}
