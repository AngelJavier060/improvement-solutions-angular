package com.improvementsolutions.improvement_solutions_api.service;

import com.improvementsolutions.dto.CreateBusinessEmployeeDto;
import com.improvementsolutions.dto.UpdateBusinessEmployeeDto;
import com.improvementsolutions.dto.BusinessEmployeeResponseDto;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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
    
    // Método helper para convertir RUC a Business ID
    private Long getBusinessIdFromRuc(String ruc) {
        Optional<Business> business = businessRepository.findByRuc(ruc);
        if (business.isPresent()) {
            return business.get().getId();
        } else {
            // Si no existe, crear o retornar error
            throw new IllegalArgumentException("No se encontró empresa con RUC: " + ruc);
        }
    }
    
    @Transactional(readOnly = true)
    public List<BusinessEmployeeResponseDto> getAllEmployeesByCompany(String codigoEmpresa) {
        log.info("Obteniendo todos los empleados para la empresa: {}", codigoEmpresa);
        try {
            Long businessId = getBusinessIdFromRuc(codigoEmpresa);
            List<BusinessEmployee> employees = businessEmployeeRepository.findByBusinessId(businessId);
            return employees.stream()
                    .map(this::convertToResponseDto)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error al buscar empleados por empresa {}: {}", codigoEmpresa, e.getMessage());
            // Si no se puede convertir RUC, intentar buscar directamente por el string como ID
            try {
                Long businessId = Long.parseLong(codigoEmpresa);
                List<BusinessEmployee> employees = businessEmployeeRepository.findByBusinessId(businessId);
                return employees.stream()
                        .map(this::convertToResponseDto)
                        .collect(Collectors.toList());
            } catch (NumberFormatException ex) {
                log.error("No se pudo convertir {} a ID de empresa", codigoEmpresa);
                return List.of(); // Retornar lista vacía si no se puede resolver
            }
        }
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
        
        // Obtener la empresa: usar businessId si está disponible, sino buscar por RUC
        Long businessId;
        if (createDto.getBusinessId() != null) {
            businessId = createDto.getBusinessId();
            log.info("Usando businessId directo: {}", businessId);
        } else {
            businessId = getBusinessIdFromRuc(createDto.getCodigoEmpresa());
            log.info("Obteniendo businessId desde RUC: {}", createDto.getCodigoEmpresa());
        }
        
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));
        
        // Validar que no exista empleado con la misma cédula en la empresa
        if (businessEmployeeRepository.existsByBusinessIdAndCedula(businessId, createDto.getCedula())) {
            throw new IllegalArgumentException("Ya existe un empleado con la cédula " + createDto.getCedula() + " en esta empresa");
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
            employee.setStatus("ACTIVO");
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
        
        updateEntityFromUpdateDto(existingEmployee, updateDto);
        
        BusinessEmployee savedEmployee = businessEmployeeRepository.save(existingEmployee);
        log.info("Empleado actualizado exitosamente con ID: {}", savedEmployee.getId());
        
        return convertToResponseDto(savedEmployee);
    }
    
    @Transactional
    public void deleteEmployee(Long id) {
        log.info("Eliminando empleado con ID: {}", id);
        
        if (!businessEmployeeRepository.existsById(id)) {
            throw new IllegalArgumentException("Empleado no encontrado con ID: " + id);
        }
        
        businessEmployeeRepository.deleteById(id);
        log.info("Empleado eliminado exitosamente con ID: {}", id);
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
        dto.setCodigoEmpresa(employee.getBusiness() != null ? employee.getBusiness().getRuc() : null);
        dto.setTipoSangre(employee.getTipoSangre());
        dto.setSalario(employee.getSalario()); // Mapear el campo salario
        dto.setCodigoIess(employee.getCodigoIess());
        dto.setNivelEducacion(employee.getNivelEducacion());
        dto.setDiscapacidad(employee.getDiscapacidad());
        dto.setActive(employee.getActive());
        dto.setStatus(employee.getStatus());
        dto.setImagePath(employee.getImagePath());
        dto.setCreatedAt(employee.getCreatedAt());
        dto.setUpdatedAt(employee.getUpdatedAt());
    dto.setPosition(employee.getPosition()); // Mapear el nombre del cargo
        return dto;
    }
    
    private BusinessEmployee convertCreateDtoToEntity(CreateBusinessEmployeeDto createDto) {
        BusinessEmployee employee = new BusinessEmployee();
        employee.setCedula(createDto.getCedula());
        employee.setApellidos(createDto.getApellidos());
        employee.setNombres(createDto.getNombres());
        // Asignar el campo name con el nombre completo
        employee.setName(createDto.getNombres() + " " + createDto.getApellidos());
        employee.setPhone(createDto.getPhone());
        employee.setEmail(createDto.getEmail());
        employee.setDateBirth(createDto.getDateBirth());
        employee.setLugarNacimientoProvincia(createDto.getLugarNacimientoProvincia());
        employee.setLugarNacimientoCiudad(createDto.getLugarNacimientoCiudad());
        employee.setLugarNacimientoParroquia(createDto.getLugarNacimientoParroquia());
        employee.setAddress(createDto.getAddress());
        employee.setDireccionDomiciliaria(createDto.getDireccionDomiciliaria());
        employee.setResidentAddress(createDto.getResidentAddress()); // Mapear resident address
        employee.setContactName(createDto.getContactName());
        employee.setContactPhone(createDto.getContactPhone());
        employee.setContactKinship(createDto.getContactKinship());
        employee.setFechaIngreso(createDto.getFechaIngreso());
        employee.setTipoSangre(createDto.getTipoSangre());
        employee.setSalario(createDto.getSalario()); // Mapear el campo salario
        employee.setCodigoIess(createDto.getCodigoIess());
        employee.setIess(createDto.getIess()); // Mapear campo IESS
        employee.setCodigoEmpresa(createDto.getCodigoEmpresa());
        employee.setNivelEducacion(createDto.getNivelEducacion());
        employee.setDiscapacidad(createDto.getDiscapacidad());
        employee.setActive(createDto.getActive() != null ? createDto.getActive() : true);
        employee.setStatus(createDto.getStatus() != null ? createDto.getStatus() : "ACTIVO");
        employee.setImagePath(createDto.getImagePath());
        
        // Asignar entidades relacionadas usando los IDs
        if (createDto.getPositionId() != null) {
            Position position = positionRepository.findById(createDto.getPositionId())
                    .orElseThrow(() -> new IllegalArgumentException("Cargo no encontrado con ID: " + createDto.getPositionId()));
            employee.setPositionEntity(position);
            employee.setPosition(position.getName()); // Asignar también el nombre como string
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
        
        // Asignar empresa contratista y bloque (nuevos campos)
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
        employee.setCedula(updateDto.getCedula());
        employee.setApellidos(updateDto.getApellidos());
        employee.setNombres(updateDto.getNombres());
        // Actualizar el campo name con el nombre completo
        employee.setName(updateDto.getNombres() + " " + updateDto.getApellidos());
        employee.setPhone(updateDto.getPhone());
        employee.setEmail(updateDto.getEmail());
        employee.setDateBirth(updateDto.getDateBirth());
        employee.setLugarNacimientoProvincia(updateDto.getLugarNacimientoProvincia());
        employee.setLugarNacimientoCiudad(updateDto.getLugarNacimientoCiudad());
        employee.setLugarNacimientoParroquia(updateDto.getLugarNacimientoParroquia());
        employee.setAddress(updateDto.getAddress());
        employee.setDireccionDomiciliaria(updateDto.getDireccionDomiciliaria());
        employee.setContactName(updateDto.getContactName());
        employee.setContactPhone(updateDto.getContactPhone());
        employee.setContactKinship(updateDto.getContactKinship());
        employee.setFechaIngreso(updateDto.getFechaIngreso());
        employee.setTipoSangre(updateDto.getTipoSangre());
        employee.setCodigoIess(updateDto.getCodigoIess());
        employee.setNivelEducacion(updateDto.getNivelEducacion());
        employee.setDiscapacidad(updateDto.getDiscapacidad());
        if (updateDto.getActive() != null) {
            employee.setActive(updateDto.getActive());
        }
        if (updateDto.getStatus() != null) {
            employee.setStatus(updateDto.getStatus());
        }
        if (updateDto.getImagePath() != null) {
            employee.setImagePath(updateDto.getImagePath());
        }
        employee.setUpdatedAt(LocalDateTime.now());
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
            
            // Guardar el archivo
            Path filePath = uploadPath.resolve(uniqueFileName);
            Files.copy(imageFile.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            
            log.info("Imagen guardada en: {}", filePath.toString());
            return uploadsDir + uniqueFileName;
            
        } catch (Exception e) {
            log.error("Error al guardar la imagen del empleado: {}", e.getMessage());
            throw new RuntimeException("Error al guardar la imagen: " + e.getMessage());
        }
    }
}