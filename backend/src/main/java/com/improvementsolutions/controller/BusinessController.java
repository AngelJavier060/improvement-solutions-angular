package com.improvementsolutions.controller;

import com.improvementsolutions.model.*;
import com.improvementsolutions.dto.UserResponseDto;
import com.improvementsolutions.dto.business.BusinessListDto;
import com.improvementsolutions.dto.user.CreateUserDto;
import com.improvementsolutions.service.BusinessService;
import com.improvementsolutions.service.UserService;
import com.improvementsolutions.repository.IessRepository;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.ContractorBlockRepository;
import com.improvementsolutions.repository.ContractorCompanyRepository;
import com.improvementsolutions.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

 import java.time.LocalDateTime;
 import java.util.ArrayList;
 import java.util.HashMap;
 import java.util.List;
 import java.util.Map;
 import java.util.Set;
 import java.util.Optional;
 import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/businesses")
@RequiredArgsConstructor
@Slf4j
public class BusinessController {

    private final BusinessService businessService;
    private final UserService userService;
    private final IessRepository iessRepository;
    private final BusinessRepository businessRepository;
    private final ContractorCompanyRepository contractorCompanyRepository;
    private final ContractorBlockRepository contractorBlockRepository;
    private final RoleRepository roleRepository;
    
    // Endpoints para el administrador
    @GetMapping("/admin/dashboard")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> getDashboardData() {
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("totalBusinesses", businessService.countActiveBusinesses());
        dashboard.put("recentBusinesses", businessService.findByRegistrationDateRange(
            LocalDateTime.now().minusDays(30), LocalDateTime.now()));
        dashboard.put("activeBusinesses", businessService.findAllActiveBusinesses());
        return ResponseEntity.ok(dashboard);
    }

    /**
     * Crea un administrador de empresa (usuario con ROLE_ADMIN asociado a una empresa específica).
     * Solo el SUPER_ADMIN puede usar este endpoint.
     */
    @PostMapping("/admin/{businessId}/admins")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<UserResponseDto> createBusinessAdmin(
            @PathVariable Long businessId,
            @RequestBody @jakarta.validation.Valid CreateUserDto createUserDto) {

        // 1) Verificar que la empresa exista
        Business business = businessService.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        // 2) Construir usuario base
        User user = new User();
        user.setName(createUserDto.getName());
        user.setEmail(createUserDto.getEmail());
        user.setPhone(createUserDto.getPhone());
        user.setUsername(createUserDto.getUsername());
        user.setPassword(createUserDto.getPassword());
        user.setActive(true);

        // 3) Asignar rol ROLE_ADMIN únicamente
        java.util.Set<Role> roles = new java.util.HashSet<>();
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("Rol ROLE_ADMIN no encontrado"));
        roles.add(adminRole);
        user.setRoles(roles);

        // 4) Asociar usuario a la empresa
        user.addBusiness(business);

        // 5) Persistir usando el servicio estándar (encripta contraseña, setea timestamps, etc.)
        User saved = userService.create(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(new UserResponseDto(saved));
    }

    /**
     * Promueve un usuario existente a ROLE_ADMIN y lo asocia a una empresa específica.
     * Solo el SUPER_ADMIN puede usar este endpoint.
     */
    @PutMapping("/admin/{businessId}/admins/{userId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<UserResponseDto> promoteUserToBusinessAdmin(
            @PathVariable Long businessId,
            @PathVariable Long userId) {

        Business business = businessService.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        User user = userService.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // Agregar ROLE_ADMIN si no lo tiene
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("Rol ROLE_ADMIN no encontrado"));
        if (!user.getRoles().contains(adminRole)) {
            user.addRole(adminRole);
        }

        // Asociar a la empresa si no está ya asociado
        if (!user.getBusinesses().contains(business)) {
            user.addBusiness(business);
        }

        // Los cambios se persisten automáticamente al final de la transacción (dirty checking)
        return ResponseEntity.ok(new UserResponseDto(user));
    }
    
    @GetMapping("/admin/search")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<Business>> searchBusinesses(@RequestParam String term) {
        return ResponseEntity.ok(businessService.searchBusinesses(term));
    }
    
    @PutMapping("/admin/{businessId}/toggle-status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> toggleBusinessStatus(@PathVariable Long businessId) {
        businessService.toggleBusinessStatus(businessId);
        return ResponseEntity.ok().build();
    }
    
    @PutMapping("/admin/{businessId}/configurations")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Business> updateBusinessConfigurations(
            @PathVariable Long businessId,
            @RequestBody Map<String, Object> configurations) {
        
        Business business = businessService.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        try {
            @SuppressWarnings("unchecked")
            Set<Department> departments = configurations.get("departments") != null ? 
                (Set<Department>) configurations.get("departments") : 
                business.getDepartments();
            
            @SuppressWarnings("unchecked")
            Set<Iess> iessItems = configurations.get("iessItems") != null ? 
                (Set<Iess>) configurations.get("iessItems") : 
                business.getIessItems();
            
            @SuppressWarnings("unchecked")
            Set<Position> positions = configurations.get("positions") != null ? 
                (Set<Position>) configurations.get("positions") : 
                business.getPositions();
            
            // Manejar empresa contratista
            ContractorCompany contractorCompany = null;
            if (configurations.get("contractorCompany") != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> contractorData = (Map<String, Object>) configurations.get("contractorCompany");
                if (contractorData.get("id") != null) {
                    Long contractorId = Long.valueOf(contractorData.get("id").toString());
                    contractorCompany = contractorCompanyRepository.findById(contractorId).orElse(null);
                }
            }
            
            // Manejar bloques de empresa contratista
            List<ContractorBlock> contractorBlocks = new ArrayList<>();
            if (configurations.get("contractorBlocks") != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> blocksData = (List<Map<String, Object>>) configurations.get("contractorBlocks");
                for (Map<String, Object> blockData : blocksData) {
                    if (blockData.get("id") != null) {
                        Long blockId = Long.valueOf(blockData.get("id").toString());
                        contractorBlockRepository.findById(blockId).ifPresent(contractorBlocks::add);
                    }
                }
            }
            
            Business updatedBusiness = businessService.updateBusinessConfigurations(
                businessId, 
                departments, 
                iessItems, 
                positions,
                contractorCompany,
                contractorBlocks
            );
            
            return ResponseEntity.ok(updatedBusiness);
        } catch (ClassCastException e) {
            throw new RuntimeException("Error al procesar las configuraciones: " + e.getMessage());
        } catch (Exception e) {
            throw new RuntimeException("Error al actualizar configuraciones: " + e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<BusinessListDto>> getAllBusinesses() {
        List<Business> businesses = businessService.findAll();
        List<BusinessListDto> dtos = businesses.stream()
                .map(BusinessListDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<Business> getBusinessById(@PathVariable Long id) {
        return businessService.findByIdWithAllRelations(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/admin")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getBusinessAdminDetails(@PathVariable Long id) {
        Business business = businessService.findByIdWithAllRelations(id)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        // Crear respuesta personalizada con todos los datos incluidos
        Map<String, Object> response = new HashMap<>();
        response.put("id", business.getId());
        response.put("name", business.getName());
        response.put("nameShort", business.getNameShort());
        response.put("ruc", business.getRuc());
        response.put("email", business.getEmail());
        response.put("phone", business.getPhone());
        response.put("secondaryPhone", business.getSecondaryPhone());
        response.put("address", business.getAddress());
        response.put("website", business.getWebsite());
        response.put("description", business.getDescription());
        response.put("commercialActivity", business.getCommercialActivity());
        response.put("tradeName", business.getTradeName());
        response.put("legalRepresentative", business.getLegalRepresentative());
        response.put("logo", business.getLogo());
        response.put("active", business.isActive());
        response.put("registrationDate", business.getRegistrationDate());
        response.put("createdAt", business.getCreatedAt());
        response.put("updatedAt", business.getUpdatedAt());
        
        // Incluir relaciones mapeadas a DTOs ligeros para evitar proxys/lazy en JSON
        java.util.function.Function<com.improvementsolutions.model.Department, Map<String, Object>> deptDto = d -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", d.getId());
            m.put("name", d.getName());
            return m;
        };
        java.util.function.Function<com.improvementsolutions.model.Position, Map<String, Object>> posDto = p -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", p.getId());
            m.put("name", p.getName());
            if (p.getDepartment() != null) m.put("departmentId", p.getDepartment().getId());
            return m;
        };
        java.util.function.Function<com.improvementsolutions.model.TypeDocument, Map<String, Object>> tdDto = t -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("name", t.getName());
            return m;
        };
        java.util.function.Function<com.improvementsolutions.model.TypeContract, Map<String, Object>> tcDto = t -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("name", t.getName());
            return m;
        };
        java.util.function.Function<com.improvementsolutions.model.CourseCertification, Map<String, Object>> ccDto = c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId());
            m.put("name", c.getName());
            return m;
        };
        java.util.function.Function<com.improvementsolutions.model.CardCatalog, Map<String, Object>> cardDto = c -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId());
            m.put("name", c.getName());
            return m;
        };
        java.util.function.Function<com.improvementsolutions.model.WorkSchedule, Map<String, Object>> wsDto = w -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", w.getId());
            m.put("name", w.getName());
            return m;
        };
        java.util.function.Function<com.improvementsolutions.model.WorkShift, Map<String, Object>> wshDto = w -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", w.getId());
            m.put("name", w.getName());
            return m;
        };
        java.util.function.Function<com.improvementsolutions.model.Iess, Map<String, Object>> iessDto = i -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", i.getId());
            // Mantener compatibilidad: frontend puede usar 'code' o 'name'
            m.put("code", i.getCode());
            m.put("name", i.getCode());
            return m;
        };

        response.put("departments", business.getDepartments().stream().map(deptDto).collect(Collectors.toList()));
        response.put("positions", business.getPositions().stream().map(posDto).collect(Collectors.toList()));
        response.put("type_documents", business.getTypeDocuments().stream().map(tdDto).collect(Collectors.toList()));
        response.put("type_contracts", business.getTypeContracts().stream().map(tcDto).collect(Collectors.toList()));
        response.put("course_certifications", business.getCourseCertifications().stream().map(ccDto).collect(Collectors.toList()));
        response.put("cards", business.getCards().stream().map(cardDto).collect(Collectors.toList()));
        response.put("workSchedules", business.getWorkSchedules().stream().map(wsDto).collect(Collectors.toList()));
        response.put("workShifts", business.getWorkShifts().stream().map(wshDto).collect(Collectors.toList()));
        response.put("ieses", business.getIessItems().stream().map(iessDto).collect(Collectors.toList()));
        // Filtrar duplicados: solo una relación activa por matriz de obligación (por catalog id)
        java.util.Map<Long, com.improvementsolutions.model.BusinessObligationMatrix> obligationMap = new java.util.LinkedHashMap<>();
        for (com.improvementsolutions.model.BusinessObligationMatrix bom : business.getBusinessObligationMatrices()) {
            if (bom.getObligationMatrix() == null) continue;
            Long catId = bom.getObligationMatrix().getId();
            // Conservar la primera aparición
            if (!obligationMap.containsKey(catId)) {
                obligationMap.put(catId, bom);
            }
        }
        // Mapear obligación por empresa a estructura ligera
        List<Map<String, Object>> bomDtos = new ArrayList<>();
        for (com.improvementsolutions.model.BusinessObligationMatrix bom : obligationMap.values()) {
            if (bom == null) continue;
            Map<String, Object> m = new HashMap<>();
            m.put("id", bom.getId());
            if (bom.getObligationMatrix() != null) {
                Map<String, Object> cat = new HashMap<>();
                cat.put("id", bom.getObligationMatrix().getId());
                cat.put("name", bom.getObligationMatrix().getName());
                m.put("obligationMatrix", cat);
            }
            bomDtos.add(m);
        }
        response.put("obligation_matrices", bomDtos);

        // Usuarios (solo info básica + roles por nombre)
        List<Map<String, Object>> userDtos = new ArrayList<>();
        for (com.improvementsolutions.model.User u : business.getUsers()) {
            if (u == null) continue;
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("name", u.getName());
            m.put("email", u.getEmail());
            m.put("active", u.getActive());
            // Roles por nombre si están inicializados
            List<String> roleNames = new ArrayList<>();
            try {
                for (com.improvementsolutions.model.Role r : u.getRoles()) {
                    if (r != null && r.getName() != null) roleNames.add(r.getName());
                }
            } catch (Exception ignored) {}
            m.put("roles", roleNames);
            userDtos.add(m);
        }
        response.put("users", userDtos);

        // Empresas contratistas y bloques (ligeros)
        List<Map<String, Object>> ccDtos = new ArrayList<>();
        for (com.improvementsolutions.model.ContractorCompany c : business.getContractorCompanies()) {
            if (c == null) continue;
            Map<String, Object> m = new HashMap<>();
            m.put("id", c.getId());
            m.put("name", c.getName());
            ccDtos.add(m);
        }
        response.put("contractor_companies", ccDtos);

        List<Map<String, Object>> cbDtos = new ArrayList<>();
        for (com.improvementsolutions.model.ContractorBlock b : business.getContractorBlocks()) {
            if (b == null) continue;
            Map<String, Object> m = new HashMap<>();
            m.put("id", b.getId());
            try { m.put("name", b.getName()); } catch (Exception ignored) {}
            if (b.getContractorCompany() != null) {
                Map<String, Object> cc = new HashMap<>();
                cc.put("id", b.getContractorCompany().getId());
                cc.put("name", b.getContractorCompany().getName());
                m.put("contractorCompany", cc);
            }
            cbDtos.add(m);
        }
        response.put("contractor_blocks", cbDtos);
        
        // Mantener compatibilidad hacia atrás
        if (!business.getContractorCompanies().isEmpty()) {
            com.improvementsolutions.model.ContractorCompany c = business.getContractorCompanies().get(0);
            Map<String, Object> cc = new HashMap<>();
            cc.put("id", c.getId());
            cc.put("name", c.getName());
            response.put("contractor_company", cc);
        } else {
            response.put("contractor_company", null);
        }
        
        return ResponseEntity.ok(response);
    }

    // Detalles accesibles para ADMIN y USER: incluye contratistas y bloques
    @GetMapping("/{id}/details")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<Map<String, Object>> getBusinessDetails(@PathVariable Long id) {
        Business business = businessService.findByIdWithAllRelations(id)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        Map<String, Object> response = new HashMap<>();
        response.put("id", business.getId());
        response.put("name", business.getName());
        response.put("nameShort", business.getNameShort());
        response.put("ruc", business.getRuc());
        response.put("email", business.getEmail());
        response.put("phone", business.getPhone());
        response.put("secondaryPhone", business.getSecondaryPhone());
        response.put("address", business.getAddress());
        response.put("website", business.getWebsite());
        response.put("description", business.getDescription());
        response.put("commercialActivity", business.getCommercialActivity());
        response.put("tradeName", business.getTradeName());
        response.put("legalRepresentative", business.getLegalRepresentative());
        response.put("logo", business.getLogo());
        response.put("active", business.isActive());
        response.put("registrationDate", business.getRegistrationDate());
        response.put("createdAt", business.getCreatedAt());
        response.put("updatedAt", business.getUpdatedAt());

        // Mapear relaciones a DTOs ligeros para evitar problemas de serialización LAZY
        List<Map<String, Object>> contractorCompaniesDto = new ArrayList<>();
        if (business.getContractorCompanies() != null) {
            for (ContractorCompany cc : business.getContractorCompanies()) {
                if (cc == null) continue;
                Map<String, Object> m = new HashMap<>();
                m.put("id", cc.getId());
                m.put("name", cc.getName());
                m.put("code", cc.getCode());
                m.put("active", cc.getActive());
                contractorCompaniesDto.add(m);
            }
        }

        List<Map<String, Object>> contractorBlocksDto = new ArrayList<>();
        if (business.getContractorBlocks() != null) {
            for (ContractorBlock cb : business.getContractorBlocks()) {
                if (cb == null) continue;
                Map<String, Object> m = new HashMap<>();
                m.put("id", cb.getId());
                m.put("name", cb.getName());
                m.put("code", cb.getCode());
                m.put("active", cb.getActive());
                ContractorCompany cc = cb.getContractorCompany();
                if (cc != null) {
                    m.put("contractorCompanyId", cc.getId());
                    m.put("contractorCompanyName", cc.getName());
                } else {
                    m.put("contractorCompanyId", null);
                    m.put("contractorCompanyName", null);
                }
                contractorBlocksDto.add(m);
            }
        }

        response.put("contractor_companies", contractorCompaniesDto);
        response.put("contractor_blocks", contractorBlocksDto);

        // Compatibilidad hacia atrás: contractor_company singular
        if (!contractorCompaniesDto.isEmpty()) {
            response.put("contractor_company", contractorCompaniesDto.get(0));
        } else {
            response.put("contractor_company", null);
        }

        log.debug("[BusinessController] getBusinessDetails id={} companies={} blocks={}", id,
                contractorCompaniesDto.size(), contractorBlocksDto.size());

        return ResponseEntity.ok(response);
    }

    // === ENDPOINTS PARA CURSOS Y CERTIFICACIONES ===
    @PostMapping("/{businessId}/course-certifications/{courseCertificationId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> addCourseCertificationToBusiness(
            @PathVariable Long businessId,
            @PathVariable Long courseCertificationId) {

        businessService.addCourseCertificationToBusiness(businessId, courseCertificationId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Curso/Certificación agregado exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/course-certifications/{courseCertificationId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> removeCourseCertificationFromBusiness(
            @PathVariable Long businessId,
            @PathVariable Long courseCertificationId) {

        businessService.removeCourseCertificationFromBusiness(businessId, courseCertificationId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Curso/Certificación eliminado exitosamente");
        return ResponseEntity.ok(response);
    }

    // === ENDPOINTS PARA TARJETAS ===
    @PostMapping("/{businessId}/cards/{cardId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> addCardToBusiness(
            @PathVariable Long businessId,
            @PathVariable Long cardId) {

        businessService.addCardToBusiness(businessId, cardId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tarjeta agregada exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/cards/{cardId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> removeCardFromBusiness(
            @PathVariable Long businessId,
            @PathVariable Long cardId) {

        businessService.removeCardFromBusiness(businessId, cardId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tarjeta eliminada exitosamente");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/admin/configurations")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    @Transactional
    public ResponseEntity<Business> updateBusinessAdminConfigurations(
            @PathVariable Long id,
            @RequestBody Map<String, Object> configurations) {
        
        try {
            Business business = businessService.findByIdWithAllRelations(id)
                    .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
            
            System.out.println("=== DEBUG CONFIGURACIONES ===");
            System.out.println("ID de empresa: " + id);
            System.out.println("Configuraciones recibidas: " + configurations);
            
            // Actualizar IESS si están presentes
            if (configurations.containsKey("iessItems")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> iessItemsData = (List<Map<String, Object>>) configurations.get("iessItems");
                
                System.out.println("Datos IESS recibidos: " + iessItemsData);
                
                // Limpiar relaciones IESS actuales de forma segura en el lado propietario
                // Evita tocar el lado inverso LAZY (iess.businesses) que puede causar LazyInitializationException
                business.getIessItems().clear();

                // Agregar los nuevos IESS usando helper para relación bidireccional
                for (Map<String, Object> iessData : iessItemsData) {
                    Object rawId = iessData.get("id");
                    if (rawId == null) {
                        System.err.println("IESS sin 'id' en payload: " + iessData);
                        continue;
                    }
                    Long iessId = Long.valueOf(rawId.toString());
                    System.out.println("Buscando IESS con ID: " + iessId);
                    
                    Optional<Iess> iessOptional = iessRepository.findById(iessId);
                    if (iessOptional.isPresent()) {
                        Iess iess = iessOptional.get();
                        business.addIessItem(iess);
                        System.out.println("IESS agregado: " + iess.getDescription());
                    } else {
                        System.err.println("IESS no encontrado con ID: " + iessId);
                    }
                }
                
                System.out.println("Total IESS asignados: " + business.getIessItems().size());
            }

            // Actualizar empresas contratistas si está presente
            if (configurations.containsKey("contractorCompanies")) {
                Object contractorCompaniesData = configurations.get("contractorCompanies");
                
                // Limpiar empresas contratistas actuales
                business.setContractorCompanies(new ArrayList<>());
                
                if (contractorCompaniesData != null) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> companiesDataList = (List<Map<String, Object>>) contractorCompaniesData;
                    
                    System.out.println("Datos empresas contratistas recibidos: " + companiesDataList);
                    
                    // Agregar las nuevas empresas contratistas
                    for (Map<String, Object> companyData : companiesDataList) {
                        Long contractorCompanyId = Long.valueOf(companyData.get("id").toString());
                        
                        System.out.println("Buscando empresa contratista con ID: " + contractorCompanyId);
                        
                        Optional<ContractorCompany> contractorCompanyOptional = contractorCompanyRepository.findById(contractorCompanyId);
                        if (contractorCompanyOptional.isPresent()) {
                            ContractorCompany contractorCompany = contractorCompanyOptional.get();
                            business.getContractorCompanies().add(contractorCompany);
                            System.out.println("Empresa contratista asignada: " + contractorCompany.getName());
                        } else {
                            System.err.println("Empresa contratista no encontrada con ID: " + contractorCompanyId);
                        }
                    }
                }
                
                System.out.println("Total empresas contratistas asignadas: " + business.getContractorCompanies().size());
            }
            
            // Mantener compatibilidad hacia atrás con contractorCompany (singular)
            if (configurations.containsKey("contractorCompany")) {
                Object contractorCompanyData = configurations.get("contractorCompany");
                
                if (contractorCompanyData == null) {
                    // Remover todas las empresas contratistas
                    business.setContractorCompanies(new ArrayList<>());
                    business.setContractorBlocks(new ArrayList<>());
                    System.out.println("Todas las empresas contratistas removidas");
                } else {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> companyData = (Map<String, Object>) contractorCompanyData;
                    Long contractorCompanyId = Long.valueOf(companyData.get("id").toString());
                    
                    System.out.println("Buscando empresa contratista con ID: " + contractorCompanyId);
                    
                    Optional<ContractorCompany> contractorCompanyOptional = contractorCompanyRepository.findById(contractorCompanyId);
                    if (contractorCompanyOptional.isPresent()) {
                        ContractorCompany contractorCompany = contractorCompanyOptional.get();
                        // Para compatibilidad, reemplazar todas las empresas contratistas con esta una
                        business.setContractorCompanies(new ArrayList<>());
                        business.getContractorCompanies().add(contractorCompany);
                        System.out.println("Empresa contratista asignada (modo singular): " + contractorCompany.getName());
                    } else {
                        System.err.println("Empresa contratista no encontrada con ID: " + contractorCompanyId);
                    }
                }
            }

            // Actualizar bloques contratistas si están presentes
            if (configurations.containsKey("contractorBlocks")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> contractorBlocksData = (List<Map<String, Object>>) configurations.get("contractorBlocks");
                
                System.out.println("Datos bloques contratistas recibidos: " + contractorBlocksData);
                
                // Limpiar los bloques actuales
                business.setContractorBlocks(new ArrayList<>());
                
                // Agregar los nuevos bloques
                for (Map<String, Object> blockData : contractorBlocksData) {
                    Long blockId = Long.valueOf(blockData.get("id").toString());
                    System.out.println("Buscando bloque contratista con ID: " + blockId);
                    
                    Optional<ContractorBlock> blockOptional = contractorBlockRepository.findById(blockId);
                    if (blockOptional.isPresent()) {
                        ContractorBlock block = blockOptional.get();
                        business.getContractorBlocks().add(block);
                        System.out.println("Bloque contratista agregado: " + block.getName());
                    } else {
                        System.err.println("Bloque contratista no encontrado con ID: " + blockId);
                    }
                }
                
                System.out.println("Total bloques contratistas asignados: " + business.getContractorBlocks().size());
            }
            
            // Actualizar el timestamp
            business.setUpdatedAt(LocalDateTime.now());
            
            // USAR businessRepository.save() en lugar de businessService.update()
            // porque save() maneja las relaciones ManyToMany correctamente
            Business updatedBusiness = businessRepository.save(business);
            
            System.out.println("Empresa actualizada exitosamente con " + updatedBusiness.getIessItems().size() + " IESS");
            
            return ResponseEntity.ok(updatedBusiness);
            
        } catch (Exception e) {
            System.err.println("Error en updateBusinessAdminConfigurations: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Error al procesar las configuraciones: " + e.getMessage());
        }
    }

    @GetMapping("/byUser/{userId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<Business>> getBusinessesByUserId(@PathVariable Long userId) {
        List<Business> businesses = businessService.findByUserId(userId);
        return ResponseEntity.ok(businesses);
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> createBusiness(@RequestBody Business business) {
        try {
            Business createdBusiness = businessService.create(business);
            return new ResponseEntity<>(createdBusiness, HttpStatus.CREATED);
        } catch (DataIntegrityViolationException dive) {
            log.error("[BusinessController] Violación de integridad al crear empresa: {}", dive.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new com.improvementsolutions.dto.ErrorResponse(
                            "Conflicto de datos (posible RUC duplicado)",
                            "CONFLICT",
                            409));
        } catch (IllegalArgumentException iae) {
            log.warn("[BusinessController] Datos inválidos al crear empresa: {}", iae.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new com.improvementsolutions.dto.ErrorResponse(iae.getMessage(), "BAD_REQUEST", 400));
        } catch (RuntimeException re) {
            log.warn("[BusinessController] Error de validación al crear empresa: {}", re.getMessage());
            // Nuestras validaciones en servicio lanzan RuntimeException con mensajes claros
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new com.improvementsolutions.dto.ErrorResponse(re.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            log.error("[BusinessController] Error inesperado al crear empresa: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new com.improvementsolutions.dto.ErrorResponse(
                            "Error interno al crear empresa",
                            "INTERNAL_SERVER_ERROR",
                            500));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> updateBusiness(@PathVariable Long id, @RequestBody Business business) {
        try {
            Business updatedBusiness = businessService.update(id, business);
            return ResponseEntity.ok(updatedBusiness);
        } catch (DataIntegrityViolationException dive) {
            log.error("[BusinessController] Violación de integridad al actualizar empresa {}: {}", id, dive.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new com.improvementsolutions.dto.ErrorResponse(
                            "Conflicto de datos (posible RUC duplicado)",
                            "CONFLICT",
                            409));
        } catch (IllegalArgumentException iae) {
            log.warn("[BusinessController] Datos inválidos al actualizar empresa {}: {}", id, iae.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new com.improvementsolutions.dto.ErrorResponse(iae.getMessage(), "BAD_REQUEST", 400));
        } catch (RuntimeException re) {
            log.warn("[BusinessController] Error de validación al actualizar empresa {}: {}", id, re.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new com.improvementsolutions.dto.ErrorResponse(re.getMessage(), "BAD_REQUEST", 400));
        } catch (Exception e) {
            log.error("[BusinessController] Error inesperado al actualizar empresa {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new com.improvementsolutions.dto.ErrorResponse(
                            "Error interno al actualizar empresa",
                            "INTERNAL_SERVER_ERROR",
                            500));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteBusiness(@PathVariable Long id) {
        businessService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/ruc/{ruc}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteBusinessByRuc(@PathVariable String ruc) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada con RUC: " + ruc));
        businessService.delete(business.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{businessId}/users/{userId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> addUserToBusiness(
            @PathVariable Long businessId,
            @PathVariable Long userId) {
        businessService.addUserToBusiness(businessId, userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/ruc/{ruc}/users/{userId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> addUserToBusinessByRuc(
            @PathVariable String ruc,
            @PathVariable Long userId) {
        Business business = businessService.findByRuc(ruc)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada con RUC: " + ruc));
        businessService.addUserToBusiness(business.getId(), userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{businessId}/users")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<UserResponseDto>> getUsersByBusiness(@PathVariable Long businessId) {
        // En producción spring.jpa.open-in-view está deshabilitado, por lo que
        // acceder a colecciones LAZY fuera de una transacción causa LazyInitializationException.
        // Usamos el método transaccional que inicializa todas las relaciones necesarias.
        Business business = businessService.findByIdWithAllRelations(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        return ResponseEntity.ok(UserResponseDto.fromUsers(business.getUsers()));
    }

    @GetMapping("/available-users")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<User>> getAvailableUsers() {
        return ResponseEntity.ok(businessService.getAllUsers());
    }

    @DeleteMapping("/{businessId}/users/{userId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> removeUserFromBusiness(
            @PathVariable Long businessId,
            @PathVariable Long userId) {
        businessService.removeUserFromBusiness(businessId, userId);
        return ResponseEntity.ok().build();
    }

    // Endpoints públicos
    @GetMapping("/public/search")
    public ResponseEntity<List<Business>> searchBusinessesByName(@RequestParam String name) {
        List<Business> businesses = businessService.findByName(name);
        return ResponseEntity.ok(businesses);
    }

    @GetMapping("/public/ruc/{ruc}")
    public ResponseEntity<BusinessListDto> getBusinessByRuc(@PathVariable String ruc) {
        return businessService.findByRuc(ruc)
                .map(b -> ResponseEntity.ok(BusinessListDto.fromEntity(b)))
                .orElse(ResponseEntity.notFound().build());
    }

    // === ENDPOINTS PARA DEPARTAMENTOS ===
    @PostMapping("/{businessId}/departments/{departmentId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> addDepartmentToBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long departmentId) {
        
        businessService.addDepartmentToBusiness(businessId, departmentId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Departamento agregado exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/departments/{departmentId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> removeDepartmentFromBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long departmentId) {
        
        businessService.removeDepartmentFromBusiness(businessId, departmentId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Departamento eliminado exitosamente");
        return ResponseEntity.ok(response);
    }

    // === ENDPOINTS PARA CARGOS ===
    @PostMapping("/{businessId}/positions/{positionId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> addPositionToBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long positionId) {
        
        businessService.addPositionToBusiness(businessId, positionId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Cargo agregado exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/positions/{positionId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> removePositionFromBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long positionId) {
        
        businessService.removePositionFromBusiness(businessId, positionId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Cargo eliminado exitosamente");
        return ResponseEntity.ok(response);
    }

    // === ENDPOINTS PARA TIPOS DE DOCUMENTO ===
    @PostMapping("/{businessId}/type-documents/{typeDocumentId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> addTypeDocumentToBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long typeDocumentId) {
        
        businessService.addTypeDocumentToBusiness(businessId, typeDocumentId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tipo de documento agregado exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/type-documents/{typeDocumentId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> removeTypeDocumentFromBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long typeDocumentId) {
        
        businessService.removeTypeDocumentFromBusiness(businessId, typeDocumentId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tipo de documento eliminado exitosamente");
        return ResponseEntity.ok(response);
    }

    // === ENDPOINTS PARA TIPOS DE CONTRATO ===
    @PostMapping("/{businessId}/type-contracts/{typeContractId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> addTypeContractToBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long typeContractId) {
        
        businessService.addTypeContractToBusiness(businessId, typeContractId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tipo de contrato agregado exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/type-contracts/{typeContractId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> removeTypeContractFromBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long typeContractId) {
        
        businessService.removeTypeContractFromBusiness(businessId, typeContractId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Tipo de contrato eliminado exitosamente");
        return ResponseEntity.ok(response);
    }

    // === ENDPOINTS PARA MATRICES DE OBLIGACIONES ===
    @PostMapping("/{businessId}/obligation-matrices/{obligationMatrixId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> addObligationMatrixToBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long obligationMatrixId) {
        
        businessService.addObligationMatrixToBusiness(businessId, obligationMatrixId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Matriz de obligación agregada exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/obligation-matrices/{obligationMatrixId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> removeObligationMatrixFromBusiness(
            @PathVariable Long businessId, 
            @PathVariable Long obligationMatrixId) {
        
        businessService.removeObligationMatrixFromBusiness(businessId, obligationMatrixId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Matriz de obligación eliminada exitosamente");
        return ResponseEntity.ok(response);
    }

    // Replicar matrices de obligaciones desde una empresa origen a múltiples empresas destino
    @PostMapping("/{sourceBusinessId}/obligation-matrices/replicate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> replicateObligationMatrices(
            @PathVariable Long sourceBusinessId,
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Object> rawIds = (List<Object>) body.get("targetBusinessIds");
        if (rawIds == null) {
            throw new RuntimeException("Debe enviar 'targetBusinessIds' en el cuerpo");
        }
        List<Long> targetIds = new java.util.ArrayList<>();
        for (Object o : rawIds) {
            if (o == null) continue;
            targetIds.add(Long.valueOf(o.toString()));
        }
        businessService.replicateObligationMatrices(sourceBusinessId, targetIds);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Matrices replicadas exitosamente");
        response.put("sourceBusinessId", sourceBusinessId);
        response.put("replicatedTo", targetIds);
        return ResponseEntity.ok(response);
    }

    // Agregar en bloque matrices de catálogo a una empresa
    @PostMapping("/{businessId}/obligation-matrices/bulk")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Business> addObligationMatricesBulk(
            @PathVariable Long businessId,
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Object> rawCatalogIds = (List<Object>) body.get("catalogIds");
        if (rawCatalogIds == null) {
            throw new RuntimeException("Debe enviar 'catalogIds' en el cuerpo");
        }
        List<Long> catalogIds = new java.util.ArrayList<>();
        for (Object o : rawCatalogIds) {
            if (o == null) continue;
            catalogIds.add(Long.valueOf(o.toString()));
        }

        Business updated = businessService.addObligationMatricesToBusinessBulk(businessId, catalogIds);
        return ResponseEntity.ok(updated);
    }

    // === ENDPOINTS PARA JORNADAS DE TRABAJO ===
    @PostMapping("/{businessId}/work-schedules/{workScheduleId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> addWorkScheduleToBusiness(
            @PathVariable Long businessId,
            @PathVariable Long workScheduleId) {
        businessService.addWorkScheduleToBusiness(businessId, workScheduleId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Jornada de trabajo agregada exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/work-schedules/{workScheduleId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> removeWorkScheduleFromBusiness(
            @PathVariable Long businessId,
            @PathVariable Long workScheduleId) {
        businessService.removeWorkScheduleFromBusiness(businessId, workScheduleId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Jornada de trabajo eliminada exitosamente");
        return ResponseEntity.ok(response);
    }

    // === ENDPOINTS PARA HORARIOS DE TRABAJO ===
    @PostMapping("/{businessId}/work-shifts/{workShiftId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> addWorkShiftToBusiness(
            @PathVariable Long businessId,
            @PathVariable Long workShiftId) {
        businessService.addWorkShiftToBusiness(businessId, workShiftId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Horario de trabajo agregado exitosamente");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{businessId}/work-shifts/{workShiftId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Map<String, String>> removeWorkShiftFromBusiness(
            @PathVariable Long businessId,
            @PathVariable Long workShiftId) {
        businessService.removeWorkShiftFromBusiness(businessId, workShiftId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Horario de trabajo eliminado exitosamente");
        return ResponseEntity.ok(response);
    }
}
