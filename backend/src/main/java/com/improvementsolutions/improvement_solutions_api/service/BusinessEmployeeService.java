package com.improvementsolutions.improvement_solutions_api.service;

import com.improvementsolutions.dto.CreateBusinessEmployeeDto;
import com.improvementsolutions.dto.UpdateBusinessEmployeeDto;
import com.improvementsolutions.dto.BusinessEmployeeResponseDto;
import com.improvementsolutions.dto.EmployeeMovementResponseDto;
import com.improvementsolutions.dto.CompanyEmployeeMovementRowDto;
import com.improvementsolutions.dto.EmployeeStatsDto;
import com.improvementsolutions.dto.AgeRangeStatsDto;
import com.improvementsolutions.dto.AgeGenderRangeDto;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.EmployeeRepository;
import com.improvementsolutions.repository.PositionRepository;
import com.improvementsolutions.repository.DepartmentRepository;
import com.improvementsolutions.repository.TypeContractRepository;
import com.improvementsolutions.repository.GenderRepository;
import com.improvementsolutions.repository.CivilStatusRepository;
import com.improvementsolutions.repository.EtniaRepository;
import com.improvementsolutions.repository.DegreeRepository;
import com.improvementsolutions.repository.ContractorCompanyRepository;
import com.improvementsolutions.repository.ContractorBlockRepository;
import com.improvementsolutions.repository.WorkScheduleRepository;
import com.improvementsolutions.repository.WorkShiftRepository;
import com.improvementsolutions.repository.EmployeeWorkScheduleHistoryRepository;
import com.improvementsolutions.model.EmployeeWorkScheduleHistory;
import com.improvementsolutions.repository.EmployeeMovementRepository;
import com.improvementsolutions.repository.EmployeeWorkDayRepository;
import com.improvementsolutions.repository.BusinessEmployeeDocumentRepository;
import com.improvementsolutions.repository.BusinessEmployeeCourseRepository;
import com.improvementsolutions.repository.BusinessEmployeeContractRepository;
import com.improvementsolutions.repository.BusinessEmployeeCardRepository;

import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.Employee;
import com.improvementsolutions.model.Position;
import com.improvementsolutions.model.Department;
import com.improvementsolutions.model.TypeContract;
import com.improvementsolutions.model.Gender;
import com.improvementsolutions.model.CivilStatus;
import com.improvementsolutions.model.Etnia;
import com.improvementsolutions.model.Degree;
import com.improvementsolutions.model.ContractorCompany;
import com.improvementsolutions.model.ContractorBlock;
import com.improvementsolutions.model.WorkSchedule;
import com.improvementsolutions.model.WorkShift;
import com.improvementsolutions.model.EmployeeMovement;
import com.improvementsolutions.model.MovementType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessEmployeeService {
    
    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final BusinessRepository businessRepository;
    private final EmployeeRepository employeeRepository;
    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;
    private final TypeContractRepository typeContractRepository;
    private final GenderRepository genderRepository;
    private final CivilStatusRepository civilStatusRepository;
    private final EtniaRepository etniaRepository;
    private final DegreeRepository degreeRepository;
    private final ContractorCompanyRepository contractorCompanyRepository;
    private final ContractorBlockRepository contractorBlockRepository;
    private final WorkScheduleRepository workScheduleRepository;
    private final WorkShiftRepository workShiftRepository;
    private final EmployeeWorkScheduleHistoryRepository scheduleHistoryRepository;
    private final EmployeeMovementRepository employeeMovementRepository;
    private final BusinessEmployeeDocumentRepository businessEmployeeDocumentRepository;
    private final BusinessEmployeeCourseRepository businessEmployeeCourseRepository;
    private final BusinessEmployeeContractRepository businessEmployeeContractRepository;
    private final BusinessEmployeeCardRepository businessEmployeeCardRepository;
    private final EmployeeWorkDayRepository employeeWorkDayRepository;
    
    // Método helper para convertir RUC a Business ID
    private Long getBusinessIdFromRuc(String ruc) {
        Optional<Business> business = businessRepository.findByRuc(ruc);
        if (business.isPresent()) {
            return business.get().getId();
        } else {
            throw new IllegalArgumentException("No se encontró empresa con RUC: " + ruc);
        }
    }

    /**
     * Devuelve la composición de cargos (job roles) para una empresa (por RUC).
     * Retorna lista de cargos con cantidad y porcentaje.
     */
    @Transactional(readOnly = true)
    public java.util.List<com.improvementsolutions.dto.JobRoleDto> getJobRoleCompositionByCompany(String codigoEmpresa) {
        log.info("Calculando composición de cargos para la empresa: {}", codigoEmpresa);
        Long businessId = getBusinessIdFromRuc(codigoEmpresa);
        java.util.List<BusinessEmployee> employees = businessEmployeeRepository.findWithRelationsByBusinessId(businessId);
        
        // Solo activos
        java.util.List<BusinessEmployee> activeEmployees = employees.stream()
            .filter(this::isActive)
            .collect(java.util.stream.Collectors.toList());
        
        int totalActive = activeEmployees.size();
        if (totalActive == 0) {
            return new java.util.ArrayList<>();
        }
        
        // Agrupar por cargo
        java.util.Map<String, Long> cargoCount = activeEmployees.stream()
            .filter(emp -> emp.getPositionEntity() != null && emp.getPositionEntity().getName() != null)
            .collect(java.util.stream.Collectors.groupingBy(
                emp -> emp.getPositionEntity().getName().trim(),
                java.util.stream.Collectors.counting()
            ));
        
        // Convertir a DTOs con porcentaje
        java.util.List<com.improvementsolutions.dto.JobRoleDto> result = cargoCount.entrySet().stream()
            .map(entry -> {
                String cargo = entry.getKey();
                int cantidad = entry.getValue().intValue();
                double porcentaje = (cantidad * 100.0) / totalActive;
                
                // Determinar categoría basada en el nombre del cargo
                String categoria = determinarCategoria(cargo);
                
                return new com.improvementsolutions.dto.JobRoleDto(cargo, categoria, cantidad, porcentaje);
            })
            .sorted((a, b) -> Integer.compare(b.getCantidad(), a.getCantidad()))
            .collect(java.util.stream.Collectors.toList());
        
        return result;
    }
    
    private String determinarCategoria(String cargo) {
        if (cargo == null) return "General";
        String cargoLower = cargo.toLowerCase();
        
        if (cargoLower.contains("gerente") || cargoLower.contains("director") || cargoLower.contains("jefe")) {
            return "Executive Leadership";
        } else if (cargoLower.contains("admin") || cargoLower.contains("asistente") || cargoLower.contains("secretar")) {
            return "Support & Logistics";
        } else if (cargoLower.contains("técnico") || cargoLower.contains("tecnico") || cargoLower.contains("mantenimiento")) {
            return "Technical Operations";
        } else if (cargoLower.contains("conductor") || cargoLower.contains("chofer") || cargoLower.contains("operador")) {
            return "Operational Unit";
        } else if (cargoLower.contains("logística") || cargoLower.contains("logistica") || cargoLower.contains("coordinador")) {
            return "Fleet & Safety";
        } else if (cargoLower.contains("contador") || cargoLower.contains("financ") || cargoLower.contains("tesor")) {
            return "Finance";
        } else if (cargoLower.contains("recursos humanos") || cargoLower.contains("rrhh") || cargoLower.contains("talento")) {
            return "Human Capital";
        } else if (cargoLower.contains("seguridad") || cargoLower.contains("salud") || cargoLower.contains("sst")) {
            return "Safety & Health";
        } else if (cargoLower.contains("compras") || cargoLower.contains("adquisiciones") || cargoLower.contains("procurement")) {
            return "Supply Chain";
        } else if (cargoLower.contains("sistemas") || cargoLower.contains("ti ") || cargoLower.contains("informática")) {
            return "Information Tech";
        } else {
            return "General";
        }
    }

    /**
     * Devuelve la distribución por nivel de educación para una empresa (por RUC).
     */
    @Transactional(readOnly = true)
    public java.util.List<com.improvementsolutions.dto.EducationLevelDto> getEducationLevelsByCompany(String codigoEmpresa) {
        log.info("Calculando distribución de nivel de educación para la empresa: {}", codigoEmpresa);
        Long businessId = getBusinessIdFromRuc(codigoEmpresa);
        java.util.List<BusinessEmployee> employees = businessEmployeeRepository.findWithRelationsByBusinessId(businessId);
        
        // Solo activos
        java.util.List<BusinessEmployee> activeEmployees = employees.stream()
            .filter(this::isActive)
            .collect(java.util.stream.Collectors.toList());
        
        int totalActive = activeEmployees.size();
        if (totalActive == 0) {
            return new java.util.ArrayList<>();
        }
        
        // Agrupar por nivel de educación
        java.util.Map<String, Long> educationCount = activeEmployees.stream()
            .filter(emp -> emp.getDegree() != null && emp.getDegree().getName() != null)
            .collect(java.util.stream.Collectors.groupingBy(
                emp -> emp.getDegree().getName().trim(),
                java.util.stream.Collectors.counting()
            ));
        
        // Convertir a DTOs con porcentaje
        java.util.List<com.improvementsolutions.dto.EducationLevelDto> result = educationCount.entrySet().stream()
            .map(entry -> {
                String nivel = entry.getKey();
                int cantidad = entry.getValue().intValue();
                double porcentaje = (cantidad * 100.0) / totalActive;
                return new com.improvementsolutions.dto.EducationLevelDto(nivel, cantidad, porcentaje);
            })
            .sorted((a, b) -> Integer.compare(b.getCantidad(), a.getCantidad()))
            .collect(java.util.stream.Collectors.toList());
        
        return result;
    }

    /**
     * Devuelve la distribución por Edad y Género (piramide) para una empresa (por RUC).
     * Rangos: <18, 19-25, 26-35, 36-50, >50
     */
    @Transactional(readOnly = true)
    public java.util.List<AgeGenderRangeDto> getAgeGenderPyramidByCompany(String codigoEmpresa) {
        log.info("Calculando pirámide Edad/Género para la empresa: {}", codigoEmpresa);
        Long businessId = getBusinessIdFromRuc(codigoEmpresa);
        java.util.List<BusinessEmployee> employees = businessEmployeeRepository.findWithRelationsByBusinessId(businessId);
        // Solo activos
        java.util.List<BusinessEmployee> activeEmployees = employees.stream().filter(this::isActive).collect(java.util.stream.Collectors.toList());

        java.util.List<AgeGenderRangeDto> ranges = new java.util.ArrayList<>();
        ranges.add(new AgeGenderRangeDto("< 18", 0, 0));
        ranges.add(new AgeGenderRangeDto("18 - 25", 0, 0)); // incluir 18
        ranges.add(new AgeGenderRangeDto("26 - 35", 0, 0));
        ranges.add(new AgeGenderRangeDto("36 - 50", 0, 0));
        ranges.add(new AgeGenderRangeDto("> 50", 0, 0));
        ranges.add(new AgeGenderRangeDto("Sin dato", 0, 0)); // sin fecha de nacimiento

        for (BusinessEmployee emp : activeEmployees) {
            try {
                int idx = -1;
                Integer age = null;
                if (emp.getDateBirth() != null) {
                    age = java.time.Period.between(emp.getDateBirth().toLocalDate(), java.time.LocalDate.now()).getYears();
                }

                String gName = emp.getGender() != null ? emp.getGender().getName() : null;
                String gl = gName != null ? gName.trim().toLowerCase() : "";
                boolean isWoman = gl.startsWith("fem") || gl.startsWith("muj") || "f".equals(gl) || "femenina".equals(gl) || "female".equals(gl);
                boolean isMan = gl.startsWith("masc") || gl.startsWith("hom") || "m".equals(gl) || "masculina".equals(gl) || "male".equals(gl);

                if (age == null) idx = 5; // sin dato
                else if (age < 18) idx = 0;
                else if (age >= 18 && age <= 25) idx = 1;
                else if (age >= 26 && age <= 35) idx = 2;
                else if (age >= 36 && age <= 50) idx = 3;
                else if (age > 50) idx = 4;
                else idx = 5; // casos fuera de rango

                if (idx >= 0) {
                    AgeGenderRangeDto r = ranges.get(idx);
                    if (isWoman) r.setWomen(r.getWomen() + 1);
                    else if (isMan) r.setMen(r.getMen() + 1);
                }
            } catch (Exception ignored) {}
        }
        return ranges;
    }

    // Considera activo si active=true o status="ACTIVO" (case-insensitive)
    private boolean isActive(BusinessEmployee emp) {
        try {
            if (emp == null) return false;
            Boolean a = emp.getActive();
            if (a != null && a) return true;
            String s = emp.getStatus();
            return s != null && s.trim().equalsIgnoreCase("ACTIVO");
        } catch (Exception ignored) { return false; }
    }
    
    @Transactional(readOnly = true)
    public List<BusinessEmployeeResponseDto> getAllEmployeesByCompany(String codigoEmpresa) {
        log.info("Obteniendo todos los empleados para la empresa: {}", codigoEmpresa);
        Long businessIdResolved = getBusinessIdFromRuc(codigoEmpresa);
        List<BusinessEmployee> employees = businessEmployeeRepository.findWithRelationsByBusinessId(businessIdResolved);
        return employees.stream()
                .map(this::convertToResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BusinessEmployeeResponseDto> getEmployeesByBusinessId(Long businessId) {
        log.info("Obteniendo empleados por businessId directo: {}", businessId);
        List<BusinessEmployee> employees = businessEmployeeRepository.findWithRelationsByBusinessId(businessId);
        return employees.stream()
                .map(this::convertToResponseDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<BusinessEmployeeResponseDto> getAllEmployeesByCompanyPaginated(String codigoEmpresa, Pageable pageable) {
        log.info("Obteniendo empleados paginados para la empresa: {}, página: {}", codigoEmpresa, pageable.getPageNumber());
        Long businessId = getBusinessIdFromRuc(codigoEmpresa);
        List<BusinessEmployee> allEmployees = businessEmployeeRepository.findWithRelationsByBusinessId(businessId);
        
        // Convertir a DTOs
        List<BusinessEmployeeResponseDto> employeeDtos = allEmployees.stream()
                .map(this::convertToResponseDto)
                .collect(Collectors.toList());
        
        // Implementación simple de paginación in-memory
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), employeeDtos.size());
        
        if (start >= employeeDtos.size()) {
            return Page.empty();
        }
        
        List<BusinessEmployeeResponseDto> pageContent = employeeDtos.subList(start, end);
        return new org.springframework.data.domain.PageImpl<>(
            pageContent, 
            pageable, 
            employeeDtos.size()
        );
    }

    @Transactional(readOnly = true)
    public Page<BusinessEmployeeResponseDto> searchEmployeesByFilters(String codigoEmpresa,
                                                                      String cedula,
                                                                      String nombres,
                                                                      String apellidos,
                                                                      String codigo,
                                                                      Pageable pageable) {
        Long businessId = getBusinessIdFromRuc(codigoEmpresa);
        String fc = emptyToNull(cedula);
        String fn = emptyToNull(nombres);
        String fa = emptyToNull(apellidos);
        String fco = emptyToNull(codigo);

        // Misma carga que el listado completo (EntityGraph): evita fallos de la query JPQL paginada
        // (COUNT/sort en algunos entornos Hibernate/BD) y asegura relaciones para convertToResponseDto.
        List<BusinessEmployee> all = businessEmployeeRepository.findWithRelationsByBusinessId(businessId);

        List<BusinessEmployee> filtered = all.stream()
                .filter(be -> fc == null || (be.getCedula() != null && be.getCedula().toLowerCase().contains(fc)))
                .filter(be -> filterNombreApellidosOTextoLibre(be, fn, fa))
                .filter(be -> fco == null || (be.getCodigoEmpresa() != null
                        && be.getCodigoEmpresa().toLowerCase().contains(fco)))
                .sorted(comparatorForBusinessEmployeeList(pageable))
                .collect(Collectors.toList());

        List<BusinessEmployeeResponseDto> dtos = filtered.stream()
                .map(this::convertToResponseDto)
                .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int pageSize = pageable.getPageSize();
        if (start >= dtos.size()) {
            return new PageImpl<>(List.of(), pageable, dtos.size());
        }
        int end = Math.min(start + pageSize, dtos.size());
        return new PageImpl<>(dtos.subList(start, end), pageable, dtos.size());
    }

    /** Orden seguro para listados en memoria (whitelist de propiedades). */
    private static Comparator<BusinessEmployee> comparatorForBusinessEmployeeList(Pageable pageable) {
        Sort sort = pageable.getSort();
        if (sort == null || sort.isEmpty()) {
            return Comparator.comparing(BusinessEmployee::getApellidos,
                    Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
        }
        Sort.Order order = sort.iterator().next();
        String prop = normalizeSortProperty(order.getProperty());
        boolean desc = order.getDirection() == Sort.Direction.DESC;
        Comparator<BusinessEmployee> cmp = switch (prop) {
            case "nombres" -> Comparator.comparing(BusinessEmployee::getNombres,
                    Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
            case "cedula" -> Comparator.comparing(BusinessEmployee::getCedula,
                    Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
            case "fechaIngreso" -> Comparator.comparing(BusinessEmployee::getFechaIngreso,
                    Comparator.nullsLast(Comparator.naturalOrder()));
            case "name" -> Comparator.comparing(BusinessEmployee::getName,
                    Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
            case "codigoEmpresa" -> Comparator.comparing(BusinessEmployee::getCodigoEmpresa,
                    Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
            default -> Comparator.comparing(BusinessEmployee::getApellidos,
                    Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
        };
        return desc ? cmp.reversed() : cmp;
    }

    private static String normalizeSortProperty(String raw) {
        if (raw == null || raw.isBlank()) {
            return "apellidos";
        }
        String p = raw.trim();
        return switch (p) {
            case "nombres", "cedula", "fechaIngreso", "name", "codigoEmpresa" -> p;
            default -> "apellidos";
        };
    }

    private String emptyToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t.toLowerCase();
    }

    /**
     * Filtro de nombres/apellidos para listados paginados.
     * Si el cliente envía el mismo término en ambos (p. ej. autocompletado de conductor en gerencias de viaje),
     * se interpreta como una sola caja de búsqueda: coincide con nombre, apellido, nombre compuesto o cédula (OR).
     * Si son distintos, se mantiene el criterio AND (p. ej. filtros separados en administración).
     */
    private static boolean filterNombreApellidosOTextoLibre(BusinessEmployee be, String fn, String fa) {
        if (fn == null && fa == null) {
            return true;
        }
        if (fn != null && fa != null && fn.equals(fa)) {
            return empleadoCoincideTextoLibre(be, fn);
        }
        boolean okN = fn == null || (be.getNombres() != null && be.getNombres().toLowerCase().contains(fn));
        boolean okA = fa == null || (be.getApellidos() != null && be.getApellidos().toLowerCase().contains(fa));
        return okN && okA;
    }

    private static boolean empleadoCoincideTextoLibre(BusinessEmployee be, String term) {
        if (term == null || term.isEmpty()) {
            return true;
        }
        if (be.getCedula() != null && be.getCedula().toLowerCase().contains(term)) {
            return true;
        }
        if (be.getNombres() != null && be.getNombres().toLowerCase().contains(term)) {
            return true;
        }
        if (be.getApellidos() != null && be.getApellidos().toLowerCase().contains(term)) {
            return true;
        }
        if (be.getName() != null && be.getName().toLowerCase().contains(term)) {
            return true;
        }
        return false;
    }
    
    @Transactional(readOnly = true)
    public Optional<BusinessEmployeeResponseDto> getEmployeeById(Long id) {
        log.info("Obteniendo empleado por ID: {}", id);
        return businessEmployeeRepository.findById(id)
                .map(this::convertToResponseDto);
    }
    
    @Transactional(readOnly = true)
    public Optional<BusinessEmployeeResponseDto> getEmployeeByCedula(String cedula) {
        log.info("Obteniendo empleado por cédula: {}", cedula);
        // Buscar por cédula en todos los empleados (se podría optimizar con businessId)
        return businessEmployeeRepository.findAll().stream()
                .filter(emp -> cedula.equals(emp.getCedula()))
                .findFirst()
                .map(this::convertToResponseDto);
    }

    @Transactional(readOnly = true)
    public Optional<BusinessEmployeeResponseDto> getEmployeeByCedulaAndBusinessId(Long businessId, String cedula) {
        log.info("Obteniendo empleado por cédula {} en businessId {}", cedula, businessId);
        return businessEmployeeRepository.findByBusinessIdAndCedula(businessId, cedula)
                .map(this::convertToResponseDto);
    }

    @Transactional(readOnly = true)
    public Optional<BusinessEmployeeResponseDto> getEmployeeByCedulaAndRuc(String ruc, String cedula) {
        log.info("Obteniendo empleado por cédula {} en empresa RUC {}", cedula, ruc);
        Long businessId = getBusinessIdFromRuc(ruc);
        return businessEmployeeRepository.findByBusinessIdAndCedula(businessId, cedula)
                .map(this::convertToResponseDto);
    }
    
    @Transactional(readOnly = true)
    public List<BusinessEmployeeResponseDto> getActiveEmployeesByCompany(String codigoEmpresa) {
        log.info("Obteniendo empleados activos para la empresa: {}", codigoEmpresa);
        Long businessId = getBusinessIdFromRuc(codigoEmpresa);
        List<BusinessEmployee> employees = businessEmployeeRepository.findByBusinessIdAndStatus(businessId, "ACTIVO");
        return employees.stream()
                .map(this::convertToResponseDto)
                .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public List<BusinessEmployeeResponseDto> searchEmployeesByName(String codigoEmpresa, String searchTerm) {
        log.info("Buscando empleados por nombre en empresa {}: {}", codigoEmpresa, searchTerm);
        Long businessId = getBusinessIdFromRuc(codigoEmpresa);
        List<BusinessEmployee> employees = businessEmployeeRepository.searchByBusinessIdAndNameOrCedula(businessId, searchTerm);
        return employees.stream()
                .map(this::convertToResponseDto)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public BusinessEmployeeResponseDto createEmployee(CreateBusinessEmployeeDto createDto) {
        log.info("Creando nuevo empleado: {} {}", createDto.getNombres(), createDto.getApellidos());
        
        // Resolver empresa priorizando RUC y validando consistencia
        Long businessIdByRuc = null;
        if (createDto.getCodigoEmpresa() != null && !createDto.getCodigoEmpresa().trim().isEmpty()) {
            businessIdByRuc = getBusinessIdFromRuc(createDto.getCodigoEmpresa().trim());
            log.info("Resuelto businessId desde RUC {} => {}", createDto.getCodigoEmpresa(), businessIdByRuc);
        }

        Long providedBusinessId = createDto.getBusinessId();
        if (businessIdByRuc != null && providedBusinessId != null && !businessIdByRuc.equals(providedBusinessId)) {
            String msg = String.format("Inconsistencia entre RUC (%s) -> businessId=%s y businessId proporcionado=%s",
                    createDto.getCodigoEmpresa(), String.valueOf(businessIdByRuc), String.valueOf(providedBusinessId));
            log.error(msg);
            throw new IllegalArgumentException(msg);
        }

        Long businessId = (businessIdByRuc != null) ? businessIdByRuc : providedBusinessId;
        if (businessId == null) {
            throw new IllegalArgumentException("Debe especificar codigoEmpresa (RUC) o businessId para crear el empleado");
        }
        
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));
        
        // Validar que no exista empleado con la misma cédula en la empresa
        if (businessEmployeeRepository.existsByBusinessIdAndCedula(businessId, createDto.getCedula())) {
            throw new IllegalArgumentException("Ya existe un empleado con la cédula " + createDto.getCedula() + " en esta empresa");
        }

        // Validar duplicado por código de trabajador (si viene)
        if (createDto.getCodigoTrabajador() != null && !createDto.getCodigoTrabajador().trim().isEmpty()) {
            String code = createDto.getCodigoTrabajador().trim();
            if (businessEmployeeRepository.existsByBusinessIdAndCodigoEmpresa(businessId, code)) {
                throw new IllegalArgumentException("Ya existe un empleado con el código " + code + " en esta empresa");
            }
        }

        // Validar duplicado por nombres y apellidos exactos (case-insensitive)
        if (createDto.getNombres() != null && !createDto.getNombres().trim().isEmpty()
                && createDto.getApellidos() != null && !createDto.getApellidos().trim().isEmpty()) {
            String n = createDto.getNombres().trim();
            String a = createDto.getApellidos().trim();
            if (businessEmployeeRepository.existsByBusinessIdAndNombresIgnoreCaseAndApellidosIgnoreCase(businessId, n, a)) {
                throw new IllegalArgumentException("Ya existe un empleado llamado " + a + " " + n + " en esta empresa");
            }
        }

        // Crear o encontrar empleado
        Employee employee;
        Optional<Employee> existingEmployee = employeeRepository.findByCedula(createDto.getCedula());
        
        if (existingEmployee.isPresent()) {
            employee = existingEmployee.get();
        } else {
            employee = new Employee();
            employee.setCedula(createDto.getCedula());
            employee.setName(createDto.getNombres() + " " + createDto.getApellidos());
            employee.setNombres(createDto.getNombres());
            employee.setApellidos(createDto.getApellidos());
            employee.setStatus("ACTIVO");
            employee.setActive(Boolean.TRUE);
            employee.setCreatedAt(LocalDateTime.now());
            employee.setUpdatedAt(LocalDateTime.now());
            employee = employeeRepository.save(employee);
        }
        
        BusinessEmployee businessEmployee = convertCreateDtoToEntity(createDto);
        businessEmployee.setBusiness(business);
        businessEmployee.setEmployee(employee); // ¡Línea crítica que faltaba!
        
        BusinessEmployee savedEmployee = businessEmployeeRepository.save(businessEmployee);
        log.info("Empleado creado exitosamente con ID: {}", savedEmployee.getId());
        
        return convertToResponseDto(savedEmployee);
    }
    
    @Transactional
    public BusinessEmployeeResponseDto updateEmployee(Long id, UpdateBusinessEmployeeDto updateDto) {
        log.info("Actualizando empleado con ID: {}", id);
        
        BusinessEmployee existingEmployee = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + id));
        
        // Validar cédula única si ha cambiado
        if (!existingEmployee.getCedula().equals(updateDto.getCedula()) &&
            businessEmployeeRepository.existsByBusinessIdAndCedula(existingEmployee.getBusiness().getId(), updateDto.getCedula())) {
            throw new IllegalArgumentException("Ya existe un empleado con la cédula " + updateDto.getCedula() + " en esta empresa");
        }
        
        // Validar código de trabajador (codigoEmpresa) único si ha cambiado
        if (updateDto.getCodigoEmpresa() != null) {
            String newCode = updateDto.getCodigoEmpresa().trim();
            String current = existingEmployee.getCodigoEmpresa();
            String curTrim = current != null ? current.trim() : "";
            if (!newCode.equalsIgnoreCase(curTrim)) {
                Long businessId = existingEmployee.getBusiness() != null ? existingEmployee.getBusiness().getId() : null;
                if (businessId != null && businessEmployeeRepository.existsByBusinessIdAndCodigoEmpresa(businessId, newCode)) {
                    throw new IllegalArgumentException("Ya existe un empleado con el código " + newCode + " en esta empresa");
                }
            }
        }
        
        updateEntityFromUpdateDto(existingEmployee, updateDto);
        
        BusinessEmployee savedEmployee = businessEmployeeRepository.save(existingEmployee);
        log.info("Empleado actualizado exitosamente con ID: {}", savedEmployee.getId());
        if (savedEmployee.getFechaSalida() != null) {
            purgeWorkDaysAfterExitDate(savedEmployee.getId(), savedEmployee.getFechaSalida());
        }

        return convertToResponseDto(savedEmployee);
    }
    
    @Transactional
    public void deleteEmployee(Long id) {
        log.info("Eliminando empleado con ID: {}", id);
        
        // Cargar entidad principal
        BusinessEmployee be = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + id));

        // Eliminar dependencias explícitas para evitar violaciones de FK
        try {
            // Documentos
            var docs = businessEmployeeDocumentRepository.findByBusinessEmployeeId(id);
            if (docs != null && !docs.isEmpty()) {
                log.info("Eliminando {} documentos del empleado {}", docs.size(), id);
                businessEmployeeDocumentRepository.deleteAll(docs);
            }

            // Cursos
            var courses = businessEmployeeCourseRepository.findByBusinessEmployeeId(id);
            if (courses != null && !courses.isEmpty()) {
                log.info("Eliminando {} cursos del empleado {}", courses.size(), id);
                businessEmployeeCourseRepository.deleteAll(courses);
            }

            // Contratos
            var contracts = businessEmployeeContractRepository.findByBusinessEmployeeId(id);
            if (contracts != null && !contracts.isEmpty()) {
                log.info("Eliminando {} contratos del empleado {}", contracts.size(), id);
                businessEmployeeContractRepository.deleteAll(contracts);
            }

            // Credenciales/Tarjetas
            var cards = businessEmployeeCardRepository.findByBusinessEmployeeId(id);
            if (cards != null && !cards.isEmpty()) {
                log.info("Eliminando {} credenciales del empleado {}", cards.size(), id);
                businessEmployeeCardRepository.deleteAll(cards);
            }

            // Movimientos
            var movements = employeeMovementRepository.findByBusinessEmployeeOrderByEffectiveDateDescIdDesc(be);
            if (movements != null && !movements.isEmpty()) {
                log.info("Eliminando {} movimientos del empleado {}", movements.size(), id);
                employeeMovementRepository.deleteAll(movements);
            }

            // Finalmente eliminar el registro principal
            businessEmployeeRepository.delete(be);
            log.info("Empleado eliminado exitosamente con ID: {}", id);
        } catch (Exception e) {
            log.error("No se pudo eliminar el empleado {} por dependencias activas u otro error: {}", id, e.getMessage());
            throw e;
        }
    }
    
    @Transactional
    public BusinessEmployeeResponseDto setEmployeeActiveStatus(Long id, boolean active, LocalDate exitDate) {
        log.info("Actualizando estado activo del empleado con ID: {} a {}", id, active);
        BusinessEmployee existingEmployee = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + id));
        existingEmployee.setActive(active);
        existingEmployee.setStatus(active ? "ACTIVO" : "INACTIVO");
        if (active) {
            existingEmployee.setFechaSalida(null);
        } else {
            if (exitDate != null) {
                existingEmployee.setFechaSalida(exitDate);
            } else if (existingEmployee.getFechaSalida() == null) {
                existingEmployee.setFechaSalida(java.time.LocalDate.now());
            }
        }
        existingEmployee.setUpdatedAt(LocalDateTime.now());
        BusinessEmployee saved = businessEmployeeRepository.save(existingEmployee);
        if (Boolean.FALSE.equals(saved.getActive()) && saved.getFechaSalida() != null) {
            closeOpenScheduleHistoryAtExit(saved, saved.getFechaSalida());
            purgeWorkDaysAfterExitDate(saved.getId(), saved.getFechaSalida());
        }
        return convertToResponseDto(saved);
    }

    @Transactional
    public BusinessEmployeeResponseDto deactivateEmployee(Long id, String reason, LocalDate effectiveDate) {
        BusinessEmployee employee = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + id));
        employee.setActive(false);
        employee.setStatus("INACTIVO");
        LocalDate salida = effectiveDate != null ? effectiveDate : LocalDate.now();
        employee.setFechaSalida(salida);
        employee.setUpdatedAt(LocalDateTime.now());
        BusinessEmployee saved = businessEmployeeRepository.save(employee);

        // Registrar movimiento
        EmployeeMovement mv = new EmployeeMovement();
        mv.setBusinessEmployee(saved);
        mv.setBusiness(saved.getBusiness());
        mv.setType(MovementType.DEACTIVATION);
        mv.setReason(reason);
        mv.setEffectiveDate(effectiveDate != null ? effectiveDate : LocalDate.now());
        employeeMovementRepository.save(mv);

        closeOpenScheduleHistoryAtExit(saved, salida);
        purgeWorkDaysAfterExitDate(saved.getId(), salida);

        return convertToResponseDto(saved);
    }

    @Transactional
    public BusinessEmployeeResponseDto reactivateEmployee(Long id, LocalDate effectiveDate) {
        BusinessEmployee employee = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + id));
        LocalDate rehire = effectiveDate != null ? effectiveDate : LocalDate.now();
        employee.setActive(true);
        employee.setStatus("ACTIVO");
        employee.setFechaSalida(null);
        employee.setFechaIngreso(rehire);
        employee.setWorkScheduleStartDate(rehire);
        employee.setUpdatedAt(LocalDateTime.now());
        BusinessEmployee saved = businessEmployeeRepository.save(employee);

        // Registrar movimiento
        EmployeeMovement mv = new EmployeeMovement();
        mv.setBusinessEmployee(saved);
        mv.setBusiness(saved.getBusiness());
        mv.setType(MovementType.REACTIVATION);
        mv.setEffectiveDate(rehire);
        employeeMovementRepository.save(mv);

        createRehireScheduleHistory(saved, rehire);

        return convertToResponseDto(saved);
    }

    /**
     * Todos los movimientos laborales de la empresa (salidas/reingresos), más recientes primero.
     */
    @Transactional(readOnly = true)
    public List<CompanyEmployeeMovementRowDto> getCompanyEmployeeMovementsByRuc(String ruc) {
        Business business = businessRepository.findByRuc(ruc)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada con RUC: " + ruc));
        return employeeMovementRepository.findAllByBusinessIdOrderByEffectiveDateDesc(business.getId()).stream()
                .map(m -> {
                    BusinessEmployee e = m.getBusinessEmployee();
                    CompanyEmployeeMovementRowDto d = new CompanyEmployeeMovementRowDto();
                    d.setId(m.getId());
                    d.setEmployeeId(e != null ? e.getId() : null);
                    d.setEmployeeFullName(e != null ? e.getFullName() : null);
                    d.setCedula(e != null ? e.getCedula() : null);
                    d.setMovementType(m.getType() != null ? m.getType().name() : null);
                    d.setEffectiveDate(m.getEffectiveDate());
                    d.setReason(m.getReason());
                    d.setCreatedAt(m.getCreatedAt());
                    return d;
                })
                .collect(Collectors.toList());
    }

    /**
     * Historial de desvinculaciones y reingresos (tabla {@code employee_movements}), más reciente primero.
     */
    @Transactional(readOnly = true)
    public List<EmployeeMovementResponseDto> getEmployeeMovements(Long employeeId) {
        BusinessEmployee emp = businessEmployeeRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + employeeId));
        return employeeMovementRepository.findByBusinessEmployeeOrderByEffectiveDateDescIdDesc(emp).stream()
                .map(m -> {
                    EmployeeMovementResponseDto d = new EmployeeMovementResponseDto();
                    d.setId(m.getId());
                    d.setMovementType(m.getType() != null ? m.getType().name() : null);
                    d.setEffectiveDate(m.getEffectiveDate());
                    d.setReason(m.getReason());
                    d.setCreatedAt(m.getCreatedAt());
                    return d;
                })
                .collect(Collectors.toList());
    }

    private BusinessEmployeeResponseDto convertToResponseDto(BusinessEmployee employee) {
        BusinessEmployeeResponseDto dto = new BusinessEmployeeResponseDto();
        dto.setId(employee.getId());
        dto.setCedula(employee.getCedula());
        dto.setApellidos(employee.getApellidos());
        dto.setNombres(employee.getNombres());
        dto.setPhone(employee.getPhone());
        dto.setEmail(employee.getEmail());
        dto.setDateBirth(employee.getDateBirth());
        dto.setLugarNacimientoProvincia(employee.getLugarNacimientoProvincia());
        dto.setLugarNacimientoCiudad(employee.getLugarNacimientoCiudad());
        dto.setLugarNacimientoParroquia(employee.getLugarNacimientoParroquia());
        dto.setAddress(employee.getAddress());
        dto.setDireccionDomiciliaria(employee.getDireccionDomiciliaria());
        dto.setContactName(employee.getContactName());
        dto.setContactPhone(employee.getContactPhone());
        dto.setContactKinship(employee.getContactKinship());
        dto.setFechaIngreso(employee.getFechaIngreso());
        dto.setFechaSalida(employee.getFechaSalida());
        dto.setMotivoSalida(null);
        if (Boolean.FALSE.equals(employee.getActive())) {
            List<EmployeeMovement> lastOut = employeeMovementRepository.findDeactivationsForEmployeeNewestFirst(
                    employee.getId(), MovementType.DEACTIVATION, PageRequest.of(0, 1));
            if (lastOut != null && !lastOut.isEmpty()) {
                dto.setMotivoSalida(lastOut.get(0).getReason());
            }
        }
        // Mantener RUC de empresa en codigoEmpresa
        dto.setCodigoEmpresa(employee.getBusiness() != null ? employee.getBusiness().getRuc() : null);
        // Exponer código del trabajador almacenado en la entidad (misma columna nombre legado)
        dto.setCodigoTrabajador(employee.getCodigoEmpresa());
        dto.setTipoSangre(employee.getTipoSangre());
        dto.setSalario(employee.getSalario());
        dto.setCodigoIess(employee.getCodigoIess());
        dto.setNivelEducacion(employee.getNivelEducacion());
        dto.setDiscapacidad(employee.getDiscapacidad());
        dto.setActive(employee.getActive());
        dto.setStatus(employee.getStatus());
        dto.setImagePath(employee.getImagePath());
        dto.setCreatedAt(employee.getCreatedAt());
        dto.setUpdatedAt(employee.getUpdatedAt());
        dto.setPosition(employee.getPosition());
        // IDs
        dto.setBusinessId(employee.getBusiness() != null ? employee.getBusiness().getId() : null);
        dto.setPositionId(employee.getPositionEntity() != null ? employee.getPositionEntity().getId() : null);
        dto.setDepartmentId(employee.getDepartment() != null ? employee.getDepartment().getId() : null);
        dto.setTypeContractId(employee.getTypeContract() != null ? employee.getTypeContract().getId() : null);
        dto.setGenderId(employee.getGender() != null ? employee.getGender().getId() : null);
        dto.setCivilStatusId(employee.getCivilStatus() != null ? employee.getCivilStatus().getId() : null);
        dto.setEtniaId(employee.getEtnia() != null ? employee.getEtnia().getId() : null);
        dto.setDegreeId(employee.getDegree() != null ? employee.getDegree().getId() : null);
        // Nombres
        dto.setPositionName(
            employee.getPosition() != null && !employee.getPosition().isEmpty()
                ? employee.getPosition()
                : (employee.getPositionEntity() != null ? employee.getPositionEntity().getName() : null)
        );
        dto.setDepartmentName(employee.getDepartment() != null ? employee.getDepartment().getName() : null);
        dto.setContractTypeName(employee.getTypeContract() != null ? employee.getTypeContract().getName() : null);
        dto.setGenderName(employee.getGender() != null ? employee.getGender().getName() : null);
        dto.setCivilStatusName(employee.getCivilStatus() != null ? employee.getCivilStatus().getName() : null);
        dto.setEtniaName(employee.getEtnia() != null ? employee.getEtnia().getName() : null);
        dto.setDegreeName(employee.getDegree() != null ? employee.getDegree().getName() : null);
        // Jornada y horario de trabajo
        dto.setWorkScheduleId(employee.getWorkSchedule() != null ? employee.getWorkSchedule().getId() : null);
        dto.setWorkScheduleName(employee.getWorkSchedule() != null ? employee.getWorkSchedule().getName() : null);
        dto.setWorkShiftId(employee.getWorkShift() != null ? employee.getWorkShift().getId() : null);
        dto.setWorkShiftName(employee.getWorkShift() != null ? employee.getWorkShift().getName() : null);
        // Empresa contratista y bloque
        if (employee.getContractorCompany() != null) {
            dto.setContractorCompanyId(employee.getContractorCompany().getId());
            dto.setContractorCompanyName(employee.getContractorCompany().getName());
        }
        if (employee.getContractorBlock() != null) {
            dto.setContractorBlockId(employee.getContractorBlock().getId());
            dto.setContractorBlockName(employee.getContractorBlock().getName());
        }
        return dto;
    }

    private BusinessEmployee convertCreateDtoToEntity(CreateBusinessEmployeeDto createDto) {
        BusinessEmployee employee = new BusinessEmployee();
        employee.setCedula(createDto.getCedula());
        employee.setApellidos(createDto.getApellidos());
        employee.setNombres(createDto.getNombres());
        // Nombre completo
        employee.setName(createDto.getNombres() + " " + createDto.getApellidos());
        employee.setPhone(createDto.getPhone());
        employee.setEmail(createDto.getEmail());
        employee.setDateBirth(createDto.getDateBirth());
        employee.setLugarNacimientoProvincia(createDto.getLugarNacimientoProvincia());
        employee.setLugarNacimientoCiudad(createDto.getLugarNacimientoCiudad());
        employee.setLugarNacimientoParroquia(createDto.getLugarNacimientoParroquia());
        employee.setAddress(createDto.getAddress());
        employee.setDireccionDomiciliaria(createDto.getDireccionDomiciliaria());
        employee.setResidentAddress(createDto.getResidentAddress());
        employee.setContactName(createDto.getContactName());
        employee.setContactPhone(createDto.getContactPhone());
        employee.setContactKinship(createDto.getContactKinship());
        employee.setFechaIngreso(createDto.getFechaIngreso());
        employee.setTipoSangre(createDto.getTipoSangre());
        employee.setSalario(createDto.getSalario());
        employee.setCodigoIess(createDto.getCodigoIess());
        employee.setIess(createDto.getIess());
        // Usamos el campo legado 'codigoEmpresa' como código único del trabajador
        employee.setCodigoEmpresa(createDto.getCodigoTrabajador());
        employee.setNivelEducacion(createDto.getNivelEducacion());
        employee.setDiscapacidad(createDto.getDiscapacidad());
        employee.setActive(createDto.getActive() != null ? createDto.getActive() : true);
        employee.setStatus(createDto.getStatus() != null ? createDto.getStatus() : "ACTIVO");
        employee.setImagePath(createDto.getImagePath());

        if (createDto.getPositionId() != null) {
            Position position = positionRepository.findById(createDto.getPositionId())
                .orElseThrow(() -> new IllegalArgumentException("Cargo no encontrado con ID: " + createDto.getPositionId()));
            employee.setPositionEntity(position);
            employee.setPosition(position.getName());
        }
        if (createDto.getDepartmentId() != null) {
            Department department = departmentRepository.findById(createDto.getDepartmentId())
                .orElseThrow(() -> new IllegalArgumentException("Departamento no encontrado con ID: " + createDto.getDepartmentId()));
            employee.setDepartment(department);
        }
        if (createDto.getTypeContractId() != null) {
            TypeContract typeContract = typeContractRepository.findById(createDto.getTypeContractId())
                .orElseThrow(() -> new IllegalArgumentException("Tipo de contrato no encontrado con ID: " + createDto.getTypeContractId()));
            employee.setTypeContract(typeContract);
        }
        if (createDto.getGenderId() != null) {
            Gender gender = genderRepository.findById(createDto.getGenderId())
                .orElseThrow(() -> new IllegalArgumentException("Género no encontrado con ID: " + createDto.getGenderId()));
            employee.setGender(gender);
        }
        if (createDto.getCivilStatusId() != null) {
            CivilStatus civilStatus = civilStatusRepository.findById(createDto.getCivilStatusId())
                .orElseThrow(() -> new IllegalArgumentException("Estado civil no encontrado con ID: " + createDto.getCivilStatusId()));
            employee.setCivilStatus(civilStatus);
        }
        if (createDto.getEtniaId() != null) {
            Etnia etnia = etniaRepository.findById(createDto.getEtniaId())
                .orElseThrow(() -> new IllegalArgumentException("Etnia no encontrada con ID: " + createDto.getEtniaId()));
            employee.setEtnia(etnia);
        }
        if (createDto.getDegreeId() != null) {
            Degree degree = degreeRepository.findById(createDto.getDegreeId())
                .orElseThrow(() -> new IllegalArgumentException("Grado de educación no encontrado con ID: " + createDto.getDegreeId()));
            employee.setDegree(degree);
        }
        if (createDto.getContractorCompanyId() != null) {
            ContractorCompany contractorCompany = contractorCompanyRepository.findById(createDto.getContractorCompanyId())
                .orElseThrow(() -> new IllegalArgumentException("Empresa contratista no encontrada con ID: " + createDto.getContractorCompanyId()));
            employee.setContractorCompany(contractorCompany);
        }
        if (createDto.getContractorBlockId() != null) {
            ContractorBlock contractorBlock = contractorBlockRepository.findById(createDto.getContractorBlockId())
                .orElseThrow(() -> new IllegalArgumentException("Bloque contratista no encontrado con ID: " + createDto.getContractorBlockId()));
            employee.setContractorBlock(contractorBlock);
        }
        if (createDto.getWorkScheduleId() != null) {
            WorkSchedule workSchedule = workScheduleRepository.findById(createDto.getWorkScheduleId())
                .orElseThrow(() -> new IllegalArgumentException("Jornada de trabajo no encontrada con ID: " + createDto.getWorkScheduleId()));
            employee.setWorkSchedule(workSchedule);
        }
        if (createDto.getWorkShiftId() != null) {
            WorkShift workShift = workShiftRepository.findById(createDto.getWorkShiftId())
                .orElseThrow(() -> new IllegalArgumentException("Horario de trabajo no encontrado con ID: " + createDto.getWorkShiftId()));
            employee.setWorkShift(workShift);
        }

        employee.setCreatedAt(LocalDateTime.now());
        employee.setUpdatedAt(LocalDateTime.now());
        return employee;
    }
    
    private void updateEntityFromUpdateDto(BusinessEmployee employee, UpdateBusinessEmployeeDto updateDto) {
        // Valores previos para detectar cambios en jornada/horario
        Long oldWorkScheduleId = employee.getWorkSchedule() != null ? employee.getWorkSchedule().getId() : null;
        Long oldWorkShiftId = employee.getWorkShift() != null ? employee.getWorkShift().getId() : null;
        if (updateDto.getCedula() != null) employee.setCedula(updateDto.getCedula());
        if (updateDto.getApellidos() != null) employee.setApellidos(updateDto.getApellidos());
        if (updateDto.getNombres() != null) employee.setNombres(updateDto.getNombres());
        if (updateDto.getPhone() != null) employee.setPhone(updateDto.getPhone());
        if (updateDto.getEmail() != null) employee.setEmail(updateDto.getEmail());
        if (updateDto.getDateBirth() != null) employee.setDateBirth(updateDto.getDateBirth());
        if (updateDto.getLugarNacimientoProvincia() != null) employee.setLugarNacimientoProvincia(updateDto.getLugarNacimientoProvincia());
        if (updateDto.getLugarNacimientoCiudad() != null) employee.setLugarNacimientoCiudad(updateDto.getLugarNacimientoCiudad());
        if (updateDto.getLugarNacimientoParroquia() != null) employee.setLugarNacimientoParroquia(updateDto.getLugarNacimientoParroquia());
        if (updateDto.getAddress() != null) employee.setAddress(updateDto.getAddress());
        if (updateDto.getDireccionDomiciliaria() != null) employee.setDireccionDomiciliaria(updateDto.getDireccionDomiciliaria());
        if (updateDto.getContactName() != null) employee.setContactName(updateDto.getContactName());
        if (updateDto.getContactPhone() != null) employee.setContactPhone(updateDto.getContactPhone());
        if (updateDto.getContactKinship() != null) employee.setContactKinship(updateDto.getContactKinship());
        if (updateDto.getFechaIngreso() != null) employee.setFechaIngreso(updateDto.getFechaIngreso());
        if (Boolean.TRUE.equals(updateDto.getActive())) {
            employee.setFechaSalida(null);
        } else if (updateDto.getFechaSalida() != null) {
            employee.setFechaSalida(updateDto.getFechaSalida());
        }
        if (updateDto.getCodigoEmpresa() != null) employee.setCodigoEmpresa(updateDto.getCodigoEmpresa());
        if (updateDto.getTipoSangre() != null) employee.setTipoSangre(updateDto.getTipoSangre());
        if (updateDto.getSalario() != null) employee.setSalario(updateDto.getSalario());
        if (updateDto.getCodigoIess() != null) employee.setCodigoIess(updateDto.getCodigoIess());
        if (updateDto.getNivelEducacion() != null) employee.setNivelEducacion(updateDto.getNivelEducacion());
        if (updateDto.getDiscapacidad() != null) employee.setDiscapacidad(updateDto.getDiscapacidad());
        // Actualizar relaciones por ID si vienen en el DTO
        if (updateDto.getPositionId() != null) {
            Position position = positionRepository.findById(updateDto.getPositionId())
                    .orElseThrow(() -> new IllegalArgumentException("Cargo no encontrado con ID: " + updateDto.getPositionId()));
            employee.setPositionEntity(position);
            employee.setPosition(position.getName());
        }
        if (updateDto.getDepartmentId() != null) {
            Department department = departmentRepository.findById(updateDto.getDepartmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Departamento no encontrado con ID: " + updateDto.getDepartmentId()));
            employee.setDepartment(department);
        }
        if (updateDto.getTypeContractId() != null) {
            TypeContract typeContract = typeContractRepository.findById(updateDto.getTypeContractId())
                    .orElseThrow(() -> new IllegalArgumentException("Tipo de contrato no encontrado con ID: " + updateDto.getTypeContractId()));
            employee.setTypeContract(typeContract);
        }
        if (updateDto.getGenderId() != null) {
            Gender gender = genderRepository.findById(updateDto.getGenderId())
                    .orElseThrow(() -> new IllegalArgumentException("Género no encontrado con ID: " + updateDto.getGenderId()));
            employee.setGender(gender);
        }
        if (updateDto.getCivilStatusId() != null) {
            CivilStatus civilStatus = civilStatusRepository.findById(updateDto.getCivilStatusId())
                    .orElseThrow(() -> new IllegalArgumentException("Estado civil no encontrado con ID: " + updateDto.getCivilStatusId()));
            employee.setCivilStatus(civilStatus);
        }
        if (updateDto.getEtniaId() != null) {
            Etnia etnia = etniaRepository.findById(updateDto.getEtniaId())
                    .orElseThrow(() -> new IllegalArgumentException("Etnia no encontrada con ID: " + updateDto.getEtniaId()));
            employee.setEtnia(etnia);
        }
        if (updateDto.getDegreeId() != null) {
            Degree degree = degreeRepository.findById(updateDto.getDegreeId())
                    .orElseThrow(() -> new IllegalArgumentException("Grado de educación no encontrado con ID: " + updateDto.getDegreeId()));
            employee.setDegree(degree);
        }
        if (updateDto.getContractorCompanyId() != null) {
            ContractorCompany contractorCompany = contractorCompanyRepository.findById(updateDto.getContractorCompanyId())
                    .orElseThrow(() -> new IllegalArgumentException("Empresa contratista no encontrada con ID: " + updateDto.getContractorCompanyId()));
            employee.setContractorCompany(contractorCompany);
        }
        if (updateDto.getContractorBlockId() != null) {
            ContractorBlock contractorBlock = contractorBlockRepository.findById(updateDto.getContractorBlockId())
                    .orElseThrow(() -> new IllegalArgumentException("Bloque contratista no encontrado con ID: " + updateDto.getContractorBlockId()));
            employee.setContractorBlock(contractorBlock);
        }
        if (updateDto.getWorkScheduleId() != null) {
            WorkSchedule workSchedule = workScheduleRepository.findById(updateDto.getWorkScheduleId())
                    .orElseThrow(() -> new IllegalArgumentException("Jornada de trabajo no encontrada con ID: " + updateDto.getWorkScheduleId()));
            employee.setWorkSchedule(workSchedule);
        }
        if (updateDto.getWorkShiftId() != null) {
            WorkShift workShift = workShiftRepository.findById(updateDto.getWorkShiftId())
                    .orElseThrow(() -> new IllegalArgumentException("Horario de trabajo no encontrado con ID: " + updateDto.getWorkShiftId()));
            employee.setWorkShift(workShift);
        }
        if (updateDto.getActive() != null) {
            employee.setActive(updateDto.getActive());
        }
        if (updateDto.getStatus() != null) {
            employee.setStatus(updateDto.getStatus());
        }
        if (updateDto.getImagePath() != null) {
            employee.setImagePath(updateDto.getImagePath());
        }
        // Recalcular nombre completo si se proporcionó alguno de los componentes
        if (updateDto.getNombres() != null || updateDto.getApellidos() != null) {
            String nombres = updateDto.getNombres() != null ? updateDto.getNombres() : employee.getNombres();
            String apellidos = updateDto.getApellidos() != null ? updateDto.getApellidos() : employee.getApellidos();
            String fullName = String.format("%s %s", nombres != null ? nombres : "", apellidos != null ? apellidos : "").trim();
            if (!fullName.isEmpty()) employee.setName(fullName);
        }
        employee.setUpdatedAt(LocalDateTime.now());

        // Registrar o actualizar histórico de jornada/horas cuando cambie jornada u horario
        Long newWorkScheduleId = employee.getWorkSchedule() != null ? employee.getWorkSchedule().getId() : null;
        Long newWorkShiftId = employee.getWorkShift() != null ? employee.getWorkShift().getId() : null;
        boolean scheduleChanged = (updateDto.getWorkScheduleId() != null && !java.util.Objects.equals(oldWorkScheduleId, newWorkScheduleId));
        boolean shiftChanged = (updateDto.getWorkShiftId() != null && !java.util.Objects.equals(oldWorkShiftId, newWorkShiftId));

        if (scheduleChanged || shiftChanged) {
            autoRegisterScheduleHistory(employee, scheduleChanged, shiftChanged);
        }
    }

    /**
     * Crea o ajusta automáticamente una entrada en employee_work_schedule_history cuando
     * cambian la jornada (workSchedule) o el horario (workShift) desde la ficha del empleado.
     * No pide fechas adicionales: usa hoy como inicio de vigencia para el nuevo periodo.
     */
    private void autoRegisterScheduleHistory(BusinessEmployee employee, boolean scheduleChanged, boolean shiftChanged) {
        if (employee.getBusiness() == null || employee.getWorkSchedule() == null) {
            return;
        }

        Long businessId = employee.getBusiness().getId();
        Long employeeId = employee.getId();
        WorkSchedule ws = employee.getWorkSchedule();

        // 1) Cerrar en automático el periodo vigente (si existe)
        java.time.LocalDate today = java.time.LocalDate.now();
        java.util.List<EmployeeWorkScheduleHistory> current =
                scheduleHistoryRepository.findOverlappingNew(businessId, employeeId, today, today);
        for (EmployeeWorkScheduleHistory h : current) {
            if (h.getEndDate() == null || !h.getEndDate().isBefore(today)) {
                h.setEndDate(today.minusDays(1));
                scheduleHistoryRepository.save(h);
            }
        }

        // 2) Calcular horas/día a partir del horario actual del empleado
        Double dailyHours = null;
        if (employee.getWorkShift() != null) {
            String shiftName = employee.getWorkShift().getName();
            dailyHours = parseDailyHoursFromShiftName(shiftName);
        }

        // 3) Crear nuevo periodo con jornada actual + horas/día inferidas
        EmployeeWorkScheduleHistory hist = new EmployeeWorkScheduleHistory();
        hist.setBusiness(employee.getBusiness());
        hist.setEmployee(employee);
        hist.setWorkSchedule(ws);
        hist.setStartDate(today);
        hist.setCycleStartDate(today);
        hist.setEndDate(null);
        hist.setDailyHours(dailyHours);
        hist.setNotes("Actualizado desde ficha de empleado (jornada/horario).");
        scheduleHistoryRepository.save(hist);
    }

    private Double parseDailyHoursFromShiftName(String name) {
        if (name == null) return null;
        String s = java.text.Normalizer.normalize(name, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(java.util.Locale.ROOT);

        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(\\d+(?:[.,]\\d+)?)\\s*(h|hora|horas)\\b")
                .matcher(s);
        if (m.find()) {
            String raw = m.group(1).replace(',', '.');
            try {
                double v = Double.parseDouble(raw);
                if (v > 0 && v <= 24) return v;
            } catch (NumberFormatException ignore) {}
        }

        java.util.regex.Matcher m2 = java.util.regex.Pattern
                .compile("(\\d+(?:[.,]\\d+)?)")
                .matcher(s);
        if (m2.find()) {
            String raw = m2.group(1).replace(',', '.');
            try {
                double v = Double.parseDouble(raw);
                if (v > 0 && v <= 24) return v;
            } catch (NumberFormatException ignore) {}
        }
        return null;
    }

    /** Cierra en la fecha de salida los periodos de jornada aún abiertos para que no proyecten T/D tras la baja. */
    private void closeOpenScheduleHistoryAtExit(BusinessEmployee emp, LocalDate exitDate) {
        if (emp == null || exitDate == null || emp.getBusiness() == null) {
            return;
        }
        Long businessId = emp.getBusiness().getId();
        Long employeeId = emp.getId();
        List<EmployeeWorkScheduleHistory> rows =
                scheduleHistoryRepository.findByBusiness_IdAndEmployee_IdOrderByStartDateDesc(businessId, employeeId);
        for (EmployeeWorkScheduleHistory h : rows) {
            if (h.getStartDate().isAfter(exitDate)) {
                continue;
            }
            if (h.getEndDate() != null && h.getEndDate().isBefore(exitDate)) {
                continue;
            }
            h.setEndDate(exitDate);
            scheduleHistoryRepository.save(h);
        }
    }

    /**
     * Tras reingreso: nuevo periodo en historial con ciclo anclado a la fecha de recontratación
     * (evita continuar el patrón T/D del periodo anterior).
     */
    private void createRehireScheduleHistory(BusinessEmployee emp, LocalDate rehireDate) {
        if (emp == null || rehireDate == null || emp.getBusiness() == null || emp.getWorkSchedule() == null) {
            return;
        }
        Long businessId = emp.getBusiness().getId();
        Long employeeId = emp.getId();
        WorkSchedule ws = emp.getWorkSchedule();
        List<EmployeeWorkScheduleHistory> overlapping =
                scheduleHistoryRepository.findOverlappingNew(businessId, employeeId, rehireDate, rehireDate);
        boolean rowAlreadyAtRehire = false;
        for (EmployeeWorkScheduleHistory h : overlapping) {
            if (h.getStartDate().isBefore(rehireDate)) {
                h.setEndDate(rehireDate.minusDays(1));
                scheduleHistoryRepository.save(h);
            } else if (h.getStartDate().equals(rehireDate)) {
                rowAlreadyAtRehire = true;
            }
        }
        Double dailyHours = null;
        if (emp.getWorkShift() != null) {
            dailyHours = parseDailyHoursFromShiftName(emp.getWorkShift().getName());
        }
        if (rowAlreadyAtRehire) {
            for (EmployeeWorkScheduleHistory h : overlapping) {
                if (h.getStartDate().equals(rehireDate)) {
                    h.setWorkSchedule(ws);
                    h.setCycleStartDate(rehireDate);
                    if (dailyHours != null) {
                        h.setDailyHours(dailyHours);
                    }
                    h.setNotes("Reingreso / recontratación.");
                    scheduleHistoryRepository.save(h);
                }
            }
            return;
        }
        EmployeeWorkScheduleHistory hist = new EmployeeWorkScheduleHistory();
        hist.setBusiness(emp.getBusiness());
        hist.setEmployee(emp);
        hist.setWorkSchedule(ws);
        hist.setStartDate(rehireDate);
        hist.setCycleStartDate(rehireDate);
        hist.setEndDate(null);
        hist.setDailyHours(dailyHours);
        hist.setNotes("Reingreso / recontratación.");
        scheduleHistoryRepository.save(hist);
    }
    
    /**
     * Obtiene estadísticas de empleados para una empresa
     */
    @Transactional(readOnly = true)
    public EmployeeStatsDto getEmployeeStatsByCompany(String codigoEmpresa) {
        log.info("Calculando estadísticas de empleados para la empresa: {}", codigoEmpresa);

        Long businessId = getBusinessIdFromRuc(codigoEmpresa);
        List<BusinessEmployee> employees = businessEmployeeRepository.findWithRelationsByBusinessId(businessId);
        // Solo personal ACTIVO
        List<BusinessEmployee> activeEmployees = employees.stream().filter(this::isActive).collect(java.util.stream.Collectors.toList());

        EmployeeStatsDto stats = new EmployeeStatsDto();
        stats.setTotal(activeEmployees.size());

        // Contar por género
        long hombres = activeEmployees.stream()
                .filter(emp -> emp.getGender() != null &&
                        ("masculino".equalsIgnoreCase(emp.getGender().getName()) ||
                         "hombre".equalsIgnoreCase(emp.getGender().getName())))
                .count();
        stats.setHombres((int) hombres);

        long mujeres = activeEmployees.stream()
                .filter(emp -> emp.getGender() != null &&
                        ("femenino".equalsIgnoreCase(emp.getGender().getName()) ||
                         "mujer".equalsIgnoreCase(emp.getGender().getName())))
                .count();
        stats.setMujeres((int) mujeres);

        // Contar personas con discapacidad
        long discapacidad = activeEmployees.stream()
                .filter(emp -> {
                    String d = emp.getDiscapacidad();
                    if (d == null) return false;
                    String v = d.trim().toLowerCase();
                    // Falsos comunes
                    if (v.isEmpty() || v.equals("no") || v.equals("ninguna") || v.equals("ninguno") || v.equals("false") || v.equals("0") || v.equals("n")) return false;
                    // Verdaderos comunes
                    return v.equals("si") || v.equals("sí") || v.equals("true") || v.equals("1") || v.contains("discap") || v.contains("si ");
                })
                .count();
        stats.setDiscapacidad((int) discapacidad);

        // Contar adolescentes (15-17 años)
        long adolescentes = activeEmployees.stream()
                .filter(emp -> {
                    if (emp.getDateBirth() == null) return false;
                    try {
                        int age = java.time.Period.between(
                                emp.getDateBirth().toLocalDate(),
                                java.time.LocalDate.now()
                        ).getYears();
                        return age >= 15 && age <= 17;
                    } catch (Exception e) {
                        return false;
                    }
                })
                .count();
        stats.setAdolescentes((int) adolescentes);

        return stats;
    }

    /**
     * Obtiene estadísticas de empleados para una empresa por businessId
     */
    @Transactional(readOnly = true)
    public EmployeeStatsDto getEmployeeStatsByBusinessId(Long businessId) {
        log.info("Calculando estadísticas de empleados para businessId: {}", businessId);
        // Buscar RUC para cubrir datos legados
        String ruc = null;
        try {
            com.improvementsolutions.model.Business b = businessRepository.findById(businessId).orElse(null);
            ruc = (b != null ? b.getRuc() : null);
        } catch (Exception ignored) {}
        List<BusinessEmployee> employees = businessEmployeeRepository.findWithRelationsByBusinessId(businessId);
        // Solo personal ACTIVO
        List<BusinessEmployee> activeEmployees = employees.stream().filter(this::isActive).collect(java.util.stream.Collectors.toList());

        EmployeeStatsDto stats = new EmployeeStatsDto();
        stats.setTotal(activeEmployees.size());

        long hombres = activeEmployees.stream()
                .filter(emp -> emp.getGender() != null &&
                        ("masculino".equalsIgnoreCase(emp.getGender().getName()) ||
                         "hombre".equalsIgnoreCase(emp.getGender().getName())))
                .count();
        stats.setHombres((int) hombres);

        long mujeres = activeEmployees.stream()
                .filter(emp -> emp.getGender() != null &&
                        ("femenino".equalsIgnoreCase(emp.getGender().getName()) ||
                         "mujer".equalsIgnoreCase(emp.getGender().getName())))
                .count();
        stats.setMujeres((int) mujeres);

        long discapacidad = activeEmployees.stream()
                .filter(emp -> emp.getDiscapacidad() != null &&
                        (emp.getDiscapacidad().toLowerCase().contains("si") ||
                         emp.getDiscapacidad().toLowerCase().contains("true") ||
                         "1".equals(emp.getDiscapacidad())))
                .count();
        stats.setDiscapacidad((int) discapacidad);

        long adolescentes = activeEmployees.stream()
                .filter(emp -> {
                    if (emp.getDateBirth() == null) return false;
                    try {
                        int age = java.time.Period.between(
                                emp.getDateBirth().toLocalDate(),
                                java.time.LocalDate.now()
                        ).getYears();
                        return age >= 15 && age <= 17;
                    } catch (Exception e) {
                        return false;
                    }
                })
                .count();
        stats.setAdolescentes((int) adolescentes);

        return stats;
    }

    /**
     * Agrega estadísticas para una lista de empresas y devuelve totales combinados
     */
    @Transactional(readOnly = true)
    public com.improvementsolutions.dto.StatsAggregationDto getAggregatedStatsByBusinessIds(java.util.List<Long> businessIds) {
        java.util.List<com.improvementsolutions.dto.BusinessStatsItemDto> items = new java.util.ArrayList<>();

        for (Long bid : businessIds) {
            if (bid == null) continue;
            EmployeeStatsDto stats = getEmployeeStatsByBusinessId(bid);
            com.improvementsolutions.model.Business b = businessRepository.findById(bid).orElse(null);
            String name = (b != null ? b.getName() : ("Empresa " + bid));
            String ruc = (b != null ? b.getRuc() : null);
            items.add(new com.improvementsolutions.dto.BusinessStatsItemDto(bid, name, ruc, stats));
        }

        EmployeeStatsDto totalCombined = new EmployeeStatsDto();
        for (com.improvementsolutions.dto.BusinessStatsItemDto it : items) {
            if (it == null || it.getStats() == null) continue;
            totalCombined.setTotal(totalCombined.getTotal() + it.getStats().getTotal());
            totalCombined.setHombres(totalCombined.getHombres() + it.getStats().getHombres());
            totalCombined.setMujeres(totalCombined.getMujeres() + it.getStats().getMujeres());
            totalCombined.setDiscapacidad(totalCombined.getDiscapacidad() + it.getStats().getDiscapacidad());
            totalCombined.setAdolescentes(totalCombined.getAdolescentes() + it.getStats().getAdolescentes());
        }

        com.improvementsolutions.dto.StatsAggregationDto dto = new com.improvementsolutions.dto.StatsAggregationDto();
        dto.setAllBusinesses(items);
        dto.setTotalCombined(totalCombined);
        // currentBusiness será asignado en el controlador si se provee
        return dto;
    }

    /**
     * Agrega estadísticas para todas las empresas asociadas a un usuario
     */
    @Transactional(readOnly = true)
    public com.improvementsolutions.dto.StatsAggregationDto getAggregatedStatsByUser(Long userId) {
        java.util.List<com.improvementsolutions.model.Business> businesses = businessRepository.findBusinessesByUserId(userId);
        java.util.List<Long> ids = businesses.stream().map(com.improvementsolutions.model.Business::getId).toList();
        return getAggregatedStatsByBusinessIds(ids);
    }

    /**
     * Calcula la distribución por rangos de edad para una empresa (por RUC).
     * Rangos: <18, 19-30, 31-50, >50
     */
    @Transactional(readOnly = true)
    public AgeRangeStatsDto getAgeRangesByCompany(String codigoEmpresa) {
        log.info("Calculando rangos de edad para la empresa: {}", codigoEmpresa);
        Long businessId = getBusinessIdFromRuc(codigoEmpresa);
        List<BusinessEmployee> employees = businessEmployeeRepository.findWithRelationsByBusinessId(businessId);

        int under18 = 0;
        int from19To30 = 0;
        int from31To50 = 0;
        int over50 = 0;

        for (BusinessEmployee emp : employees) {
            try {
                if (emp.getDateBirth() == null) continue;
                LocalDate birth = emp.getDateBirth().toLocalDate();
                int age = java.time.Period.between(birth, LocalDate.now()).getYears();

                if (age < 18) {
                    under18++;
                } else if (age >= 19 && age <= 30) {
                    from19To30++;
                } else if (age >= 31 && age <= 50) {
                    from31To50++;
                } else if (age > 50) {
                    over50++;
                }
            } catch (Exception ignored) { }
        }

        int total = under18 + from19To30 + from31To50 + over50;
        return new AgeRangeStatsDto(under18, from19To30, from31To50, over50, total);
    }

    /**
     * Guarda la imagen del empleado en el sistema de archivos
     */
    public String saveEmployeeImage(MultipartFile imageFile) {
        try {
            // Crear directorio de uploads si no existe
            String uploadsDir = "uploads/profiles/";
            Path uploadPath = Paths.get(uploadsDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generar nombre único para el archivo
            String originalFilename = imageFile.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String uniqueFileName = UUID.randomUUID().toString() + fileExtension;

            // Guardar archivo físicamente
            Path filePath = uploadPath.resolve(uniqueFileName);
            Files.copy(imageFile.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Imagen guardada en: {}", filePath.toString());
            // Retornar solo profiles/{filename} para que coincida con el endpoint GET /api/files/profiles/{filename}
            return "profiles/" + uniqueFileName;
        } catch (Exception e) {
            log.error("Error al guardar la imagen del empleado: {}", e.getMessage());
            throw new RuntimeException("Error al guardar la imagen: " + e.getMessage());
        }
    }

    /**
     * Elimina la imagen asociada al empleado y limpia el campo imagePath
     */
    @Transactional
    public BusinessEmployeeResponseDto deleteEmployeeImage(Long id) {
        BusinessEmployee employee = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + id));

        String imagePath = employee.getImagePath();
        if (imagePath != null && !imagePath.isBlank()) {
            try {
                Path path = Paths.get(imagePath);
                if (!path.isAbsolute()) {
                    path = Paths.get("").toAbsolutePath().resolve(imagePath);
                }
                if (Files.exists(path)) {
                    Files.delete(path);
                    log.info("Imagen eliminada: {}", path);
                }
            } catch (Exception e) {
                log.warn("No se pudo eliminar el archivo físico {}: {}", imagePath, e.getMessage());
            }
        }

        employee.setImagePath(null);
        employee.setUpdatedAt(LocalDateTime.now());
        BusinessEmployee saved = businessEmployeeRepository.save(employee);
        return convertToResponseDto(saved);
    }

    /** Quita de la planilla cualquier día posterior a la fecha de salida (proyección o datos inconsistentes). */
    private void purgeWorkDaysAfterExitDate(Long employeeId, LocalDate exitDate) {
        if (employeeId == null || exitDate == null) {
            return;
        }
        int removed = employeeWorkDayRepository.deleteByEmployee_IdAndWorkDateAfter(employeeId, exitDate);
        if (removed > 0) {
            log.info("Planilla: eliminados {} días posteriores a {} (empleado {})", removed, exitDate, employeeId);
        }
    }
}