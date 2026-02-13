package com.improvementsolutions.improvement_solutions_api.service;

import com.improvementsolutions.dto.CreateBusinessEmployeeDto;
import com.improvementsolutions.dto.UpdateBusinessEmployeeDto;
import com.improvementsolutions.dto.BusinessEmployeeResponseDto;
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
import com.improvementsolutions.repository.EmployeeMovementRepository;
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
import com.improvementsolutions.model.EmployeeMovement;
import com.improvementsolutions.model.MovementType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final EmployeeMovementRepository employeeMovementRepository;
    private final BusinessEmployeeDocumentRepository businessEmployeeDocumentRepository;
    private final BusinessEmployeeCourseRepository businessEmployeeCourseRepository;
    private final BusinessEmployeeContractRepository businessEmployeeContractRepository;
    private final BusinessEmployeeCardRepository businessEmployeeCardRepository;
    
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
     * Devuelve la distribución por Edad y Género (piramide) para una empresa (por RUC).
     * Rangos: <18, 19-25, 26-35, 36-50, >50
     */
    @Transactional(readOnly = true)
    public java.util.List<AgeGenderRangeDto> getAgeGenderPyramidByCompany(String codigoEmpresa) {
        log.info("Calculando pirámide Edad/Género para la empresa: {}", codigoEmpresa);
        Long businessId = getBusinessIdFromRuc(codigoEmpresa);
        java.util.List<BusinessEmployee> employees = businessEmployeeRepository.findByBusinessId(businessId);
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
        List<BusinessEmployee> allEmployees = businessEmployeeRepository.findByBusinessId(businessId);
        
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
        Page<com.improvementsolutions.model.BusinessEmployee> page = businessEmployeeRepository.searchByFilters(
                businessId,
                emptyToNull(cedula),
                emptyToNull(nombres),
                emptyToNull(apellidos),
                emptyToNull(codigo),
                pageable
        );
        return page.map(this::convertToResponseDto);
    }

    private String emptyToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t.toLowerCase();
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
    public BusinessEmployeeResponseDto setEmployeeActiveStatus(Long id, boolean active) {
        log.info("Actualizando estado activo del empleado con ID: {} a {}", id, active);
        BusinessEmployee existingEmployee = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + id));
        existingEmployee.setActive(active);
        existingEmployee.setStatus(active ? "ACTIVO" : "INACTIVO");
        existingEmployee.setUpdatedAt(LocalDateTime.now());
        BusinessEmployee saved = businessEmployeeRepository.save(existingEmployee);
        return convertToResponseDto(saved);
    }

    @Transactional
    public BusinessEmployeeResponseDto deactivateEmployee(Long id, String reason, LocalDate effectiveDate) {
        BusinessEmployee employee = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + id));
        employee.setActive(false);
        employee.setStatus("INACTIVO");
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

        return convertToResponseDto(saved);
    }

    @Transactional
    public BusinessEmployeeResponseDto reactivateEmployee(Long id, LocalDate effectiveDate) {
        BusinessEmployee employee = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado con ID: " + id));
        employee.setActive(true);
        employee.setStatus("ACTIVO");
        if (effectiveDate != null) {
            employee.setFechaIngreso(effectiveDate);
        }
        employee.setUpdatedAt(LocalDateTime.now());
        BusinessEmployee saved = businessEmployeeRepository.save(employee);

        // Registrar movimiento
        EmployeeMovement mv = new EmployeeMovement();
        mv.setBusinessEmployee(saved);
        mv.setBusiness(saved.getBusiness());
        mv.setType(MovementType.REACTIVATION);
        mv.setEffectiveDate(effectiveDate != null ? effectiveDate : LocalDate.now());
        employeeMovementRepository.save(mv);

        return convertToResponseDto(saved);
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

        employee.setCreatedAt(LocalDateTime.now());
        employee.setUpdatedAt(LocalDateTime.now());
        return employee;
    }
    
    private void updateEntityFromUpdateDto(BusinessEmployee employee, UpdateBusinessEmployeeDto updateDto) {
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
        if (updateDto.getCodigoEmpresa() != null) employee.setCodigoEmpresa(updateDto.getCodigoEmpresa());
        if (updateDto.getTipoSangre() != null) employee.setTipoSangre(updateDto.getTipoSangre());
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
    }
    
    /**
     * Obtiene estadísticas de empleados para una empresa
     */
    @Transactional(readOnly = true)
    public EmployeeStatsDto getEmployeeStatsByCompany(String codigoEmpresa) {
        log.info("Calculando estadísticas de empleados para la empresa: {}", codigoEmpresa);

        Long businessId = getBusinessIdFromRuc(codigoEmpresa);
        List<BusinessEmployee> employees = businessEmployeeRepository.findByBusinessId(businessId);
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
        List<BusinessEmployee> employees = businessEmployeeRepository.findByBusinessId(businessId);
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
        List<BusinessEmployee> employees = businessEmployeeRepository.findByBusinessId(businessId);

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
}