package com.improvementsolutions.improvement_solutions_api.controller;

import com.improvementsolutions.dto.CreateBusinessEmployeeDto;
import com.improvementsolutions.dto.UpdateBusinessEmployeeDto;
import com.improvementsolutions.dto.BusinessEmployeeResponseDto;
import com.improvementsolutions.improvement_solutions_api.dto.ErrorResponseDto;
import com.improvementsolutions.improvement_solutions_api.service.BusinessEmployeeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class BusinessEmployeeController {
    
    private final BusinessEmployeeService businessEmployeeService;
    
    // ========= ENDPOINTS COMPATIBLES CON FRONTEND ADMIN (Next.js) =========
    
    @GetMapping("/employee/{ruc}/ruc")
    public ResponseEntity<List<BusinessEmployeeResponseDto>> getEmployeesByRuc(@PathVariable String ruc) {
        try {
            log.info("Obteniendo empleados para empresa con RUC: {}", ruc);
            List<BusinessEmployeeResponseDto> employees = businessEmployeeService.getAllEmployeesByCompany(ruc);
            return ResponseEntity.ok(employees);
        } catch (Exception e) {
            log.error("Error al obtener empleados para RUC {}: {}", ruc, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/employee")
    public ResponseEntity<BusinessEmployeeResponseDto> createEmployeeWithFile(
            @RequestParam("business_ruc") String businessRuc,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @ModelAttribute CreateBusinessEmployeeDto createDto) {
        try {
            log.info("Creando empleado para empresa RUC: {}", businessRuc);
            createDto.setCodigoEmpresa(businessRuc);
            
            // TODO: Manejar archivo de imagen si está presente
            if (file != null && !file.isEmpty()) {
                log.info("Archivo de imagen recibido: {}", file.getOriginalFilename());
                // Aquí puedes agregar lógica para guardar la imagen
            }
            
            BusinessEmployeeResponseDto createdEmployee = businessEmployeeService.createEmployee(createDto);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdEmployee);
        } catch (IllegalArgumentException e) {
            log.error("Error de validación al crear empleado: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error al crear empleado: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/employee/{id}")
    public ResponseEntity<BusinessEmployeeResponseDto> updateEmployeeWithFile(
            @PathVariable Long id,
            @RequestParam("employee_cedula") String employeeCedula,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @ModelAttribute UpdateBusinessEmployeeDto updateDto) {
        try {
            log.info("Actualizando empleado ID: {}, Cédula: {}", id, employeeCedula);
            
            // TODO: Manejar archivo de imagen si está presente
            if (file != null && !file.isEmpty()) {
                log.info("Archivo de imagen recibido para actualización: {}", file.getOriginalFilename());
                // Aquí puedes agregar lógica para actualizar la imagen
            }
            
            BusinessEmployeeResponseDto updatedEmployee = businessEmployeeService.updateEmployee(id, updateDto);
            return ResponseEntity.ok(updatedEmployee);
        } catch (IllegalArgumentException e) {
            log.error("Error de validación al actualizar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error al actualizar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @DeleteMapping("/employee/{id}")
    public ResponseEntity<Void> deleteEmployeeById(@PathVariable Long id) {
        try {
            log.info("Eliminando empleado con ID: {}", id);
            businessEmployeeService.deleteEmployee(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.error("Error al eliminar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error al eliminar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/employee/{id}/status")
    public ResponseEntity<BusinessEmployeeResponseDto> updateEmployeeStatus(
            @PathVariable Long id,
            @RequestParam("employee_cedula") String employeeCedula,
            @ModelAttribute UpdateBusinessEmployeeDto updateDto) {
        try {
            log.info("Actualizando estado del empleado ID: {}, Cédula: {}", id, employeeCedula);
            BusinessEmployeeResponseDto updatedEmployee = businessEmployeeService.updateEmployee(id, updateDto);
            return ResponseEntity.ok(updatedEmployee);
        } catch (IllegalArgumentException e) {
            log.error("Error al actualizar estado del empleado {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error al actualizar estado del empleado {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/employee/search/{businessRuc}/{searchValue}")
    public ResponseEntity<List<BusinessEmployeeResponseDto>> searchEmployees(
            @PathVariable String businessRuc,
            @PathVariable String searchValue) {
        try {
            log.info("Buscando empleados en empresa {} con término: {}", businessRuc, searchValue);
            List<BusinessEmployeeResponseDto> employees = businessEmployeeService.searchEmployeesByName(businessRuc, searchValue);
            return ResponseEntity.ok(employees);
        } catch (Exception e) {
            log.error("Error al buscar empleados: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // ========= ENDPOINTS COMPATIBLES CON FRONTEND ANGULAR =========
    
    @GetMapping("/business-employees/company/{codigoEmpresa}")
    public ResponseEntity<List<BusinessEmployeeResponseDto>> getAllEmployeesByCompany(
            @PathVariable String codigoEmpresa) {
        try {
            log.info("Obteniendo empleados para la empresa: {}", codigoEmpresa);
            List<BusinessEmployeeResponseDto> employees = businessEmployeeService.getAllEmployeesByCompany(codigoEmpresa);
            return ResponseEntity.ok(employees);
        } catch (Exception e) {
            log.error("Error al obtener empleados para la empresa {}: {}", codigoEmpresa, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/businesses/{businessId}/employees")
    public ResponseEntity<List<BusinessEmployeeResponseDto>> getEmployeesByBusinessId(
            @PathVariable Long businessId) {
        try {
            log.info("Obteniendo empleados para business ID: {}", businessId);
            // Convertir businessId a string para usar con el servicio existente
            List<BusinessEmployeeResponseDto> employees = businessEmployeeService.getAllEmployeesByCompany(String.valueOf(businessId));
            return ResponseEntity.ok(employees);
        } catch (Exception e) {
            log.error("Error al obtener empleados para business ID {}: {}", businessId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/business-employees/company/{codigoEmpresa}/paginated")
    public ResponseEntity<Page<BusinessEmployeeResponseDto>> getAllEmployeesByCompanyPaginated(
            @PathVariable String codigoEmpresa,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "apellidos") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        try {
            Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
            
            log.info("Obteniendo empleados paginados para la empresa: {}, página: {}, tamaño: {}", codigoEmpresa, page, size);
            Page<BusinessEmployeeResponseDto> employees = businessEmployeeService.getAllEmployeesByCompanyPaginated(codigoEmpresa, pageable);
            return ResponseEntity.ok(employees);
        } catch (Exception e) {
            log.error("Error al obtener empleados paginados para la empresa {}: {}", codigoEmpresa, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/business-employees/company/{codigoEmpresa}/active")
    public ResponseEntity<List<BusinessEmployeeResponseDto>> getActiveEmployeesByCompany(
            @PathVariable String codigoEmpresa) {
        try {
            log.info("Obteniendo empleados activos para la empresa: {}", codigoEmpresa);
            List<BusinessEmployeeResponseDto> employees = businessEmployeeService.getActiveEmployeesByCompany(codigoEmpresa);
            return ResponseEntity.ok(employees);
        } catch (Exception e) {
            log.error("Error al obtener empleados activos para la empresa {}: {}", codigoEmpresa, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/business-employees/{id}")
    public ResponseEntity<BusinessEmployeeResponseDto> getEmployeeById(@PathVariable Long id) {
        try {
            log.info("Obteniendo empleado por ID: {}", id);
            Optional<BusinessEmployeeResponseDto> employee = businessEmployeeService.getEmployeeById(id);
            return employee.map(ResponseEntity::ok)
                          .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error al obtener empleado por ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/employees/{id}")
    public ResponseEntity<BusinessEmployeeResponseDto> getEmployeeByIdAngular(@PathVariable Long id) {
        try {
            log.info("Obteniendo empleado por ID (Angular): {}", id);
            Optional<BusinessEmployeeResponseDto> employee = businessEmployeeService.getEmployeeById(id);
            return employee.map(ResponseEntity::ok)
                          .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error al obtener empleado por ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/business-employees/cedula/{cedula}")
    public ResponseEntity<BusinessEmployeeResponseDto> getEmployeeByCedula(@PathVariable String cedula) {
        try {
            log.info("Obteniendo empleado por cédula: {}", cedula);
            Optional<BusinessEmployeeResponseDto> employee = businessEmployeeService.getEmployeeByCedula(cedula);
            return employee.map(ResponseEntity::ok)
                          .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Error al obtener empleado por cédula {}: {}", cedula, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/business-employees/company/{codigoEmpresa}/search")
    public ResponseEntity<List<BusinessEmployeeResponseDto>> searchEmployeesByNameAngular(
            @PathVariable String codigoEmpresa,
            @RequestParam String searchTerm) {
        try {
            log.info("Buscando empleados por nombre en empresa {}: {}", codigoEmpresa, searchTerm);
            List<BusinessEmployeeResponseDto> employees = businessEmployeeService.searchEmployeesByName(codigoEmpresa, searchTerm);
            return ResponseEntity.ok(employees);
        } catch (Exception e) {
            log.error("Error al buscar empleados por nombre en empresa {}: {}", codigoEmpresa, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/business-employees")
    public ResponseEntity<?> createEmployeeAngular(@RequestBody CreateBusinessEmployeeDto createDto) {
        try {
            log.info("Creando nuevo empleado (Angular): {} {}", createDto.getNombres(), createDto.getApellidos());
            BusinessEmployeeResponseDto createdEmployee = businessEmployeeService.createEmployee(createDto);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdEmployee);
        } catch (IllegalArgumentException e) {
            log.error("Error de validación al crear empleado: {}", e.getMessage());
            ErrorResponseDto errorResponse = new ErrorResponseDto(e.getMessage(), 400);
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("Error al crear empleado: {}", e.getMessage());
            ErrorResponseDto errorResponse = new ErrorResponseDto("Error interno del servidor: " + e.getMessage(), 500);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    @PostMapping("/employees")
    public ResponseEntity<?> createEmployeeAngularAlternative(@RequestBody CreateBusinessEmployeeDto createDto) {
        try {
            log.info("Creando nuevo empleado (Angular Alt): {} {}", createDto.getNombres(), createDto.getApellidos());
            BusinessEmployeeResponseDto createdEmployee = businessEmployeeService.createEmployee(createDto);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdEmployee);
        } catch (IllegalArgumentException e) {
            log.error("Error de validación al crear empleado: {}", e.getMessage());
            ErrorResponseDto errorResponse = new ErrorResponseDto(e.getMessage(), 400);
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("Error al crear empleado: {}", e.getMessage());
            ErrorResponseDto errorResponse = new ErrorResponseDto("Error interno del servidor: " + e.getMessage(), 500);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    @PostMapping(value = "/business-employees/with-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createEmployeeWithImage(
            @RequestParam("employeeData") String employeeDataJson,
            @RequestParam(value = "image", required = false) MultipartFile imageFile) {
        try {
            log.info("Creando empleado con imagen (Angular)");
            
            // Parse JSON de los datos del empleado
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.registerModule(new JavaTimeModule());
            CreateBusinessEmployeeDto createDto = objectMapper.readValue(employeeDataJson, CreateBusinessEmployeeDto.class);
            
            log.info("Datos parseados para empleado: {} {}", createDto.getNombres(), createDto.getApellidos());
            
            // Procesar la imagen si está presente
            if (imageFile != null && !imageFile.isEmpty()) {
                log.info("Procesando imagen: {}", imageFile.getOriginalFilename());
                String imagePath = businessEmployeeService.saveEmployeeImage(imageFile);
                createDto.setImagePath(imagePath);
            }
            
            BusinessEmployeeResponseDto createdEmployee = businessEmployeeService.createEmployee(createDto);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdEmployee);
        } catch (IllegalArgumentException e) {
            log.error("Error de validación al crear empleado con imagen: {}", e.getMessage());
            ErrorResponseDto errorResponse = new ErrorResponseDto(e.getMessage(), 400);
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            log.error("Error al crear empleado con imagen: {}", e.getMessage());
            ErrorResponseDto errorResponse = new ErrorResponseDto("Error interno del servidor: " + e.getMessage(), 500);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    @PutMapping("/business-employees/{id}")
    public ResponseEntity<BusinessEmployeeResponseDto> updateEmployeeAngular(
            @PathVariable Long id, 
            @RequestBody UpdateBusinessEmployeeDto updateDto) {
        try {
            log.info("Actualizando empleado con ID (Angular): {}", id);
            BusinessEmployeeResponseDto updatedEmployee = businessEmployeeService.updateEmployee(id, updateDto);
            return ResponseEntity.ok(updatedEmployee);
        } catch (IllegalArgumentException e) {
            log.error("Error de validación al actualizar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error al actualizar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PutMapping("/employees/{id}")
    public ResponseEntity<BusinessEmployeeResponseDto> updateEmployeeAngularAlternative(
            @PathVariable Long id, 
            @RequestBody UpdateBusinessEmployeeDto updateDto) {
        try {
            log.info("Actualizando empleado con ID (Angular Alt): {}", id);
            BusinessEmployeeResponseDto updatedEmployee = businessEmployeeService.updateEmployee(id, updateDto);
            return ResponseEntity.ok(updatedEmployee);
        } catch (IllegalArgumentException e) {
            log.error("Error de validación al actualizar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error al actualizar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @DeleteMapping("/business-employees/{id}")
    public ResponseEntity<Void> deleteEmployeeAngular(@PathVariable Long id) {
        try {
            log.info("Eliminando empleado con ID (Angular): {}", id);
            businessEmployeeService.deleteEmployee(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.error("Error de validación al eliminar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error al eliminar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @DeleteMapping("/employees/{id}")
    public ResponseEntity<Void> deleteEmployeeAngularAlternative(@PathVariable Long id) {
        try {
            log.info("Eliminando empleado con ID (Angular Alt): {}", id);
            businessEmployeeService.deleteEmployee(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.error("Error de validación al eliminar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error al eliminar empleado {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/employees/{employeeId}/profile-picture")
    public ResponseEntity<String> uploadProfilePicture(
            @PathVariable Long employeeId,
            @RequestParam("file") MultipartFile file) {
        try {
            log.info("Subiendo imagen de perfil para empleado ID: {}", employeeId);
            // TODO: Implementar lógica de guardado de imagen
            return ResponseEntity.ok("Imagen subida exitosamente");
        } catch (Exception e) {
            log.error("Error al subir imagen para empleado {}: {}", employeeId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al subir imagen");
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("BusinessEmployee API is running");
    }
}