package com.improvementsolutions.controller;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/configuration")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"})
public class ConfigurationController {

    private final GenderRepository genderRepository;
    private final CivilStatusRepository civilStatusRepository;
    private final EtniaRepository etniaRepository;
    private final DegreeRepository degreeRepository;
    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;
    private final TypeContractRepository typeContractRepository;
    private final BusinessRepository businessRepository;
    private final IessRepository iessRepository;

    @GetMapping("/genders")
    public ResponseEntity<List<Gender>> getAllGenders() {
        try {
            List<Gender> genders = genderRepository.findAll();
            return ResponseEntity.ok(genders);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/civil-statuses")
    public ResponseEntity<List<CivilStatus>> getAllCivilStatuses() {
        try {
            List<CivilStatus> civilStatuses = civilStatusRepository.findAll();
            return ResponseEntity.ok(civilStatuses);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/etnias")
    public ResponseEntity<List<Etnia>> getAllEtnias() {
        try {
            List<Etnia> etnias = etniaRepository.findAll();
            return ResponseEntity.ok(etnias);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/degrees")
    public ResponseEntity<List<Degree>> getAllDegrees() {
        try {
            List<Degree> degrees = degreeRepository.findAll();
            return ResponseEntity.ok(degrees);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/positions/{businessId}")
    public ResponseEntity<List<Position>> getPositionsByCompany(@PathVariable Long businessId) {
        try {
            List<Position> positions = positionRepository.findByBusinessId(businessId);
            return ResponseEntity.ok(positions);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/departments/{businessId}")
    public ResponseEntity<List<Department>> getDepartmentsByCompany(@PathVariable Long businessId) {
        try {
            List<Department> departments = departmentRepository.findByBusinessId(businessId);
            return ResponseEntity.ok(departments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/type-contracts/{businessId}")
    public ResponseEntity<List<TypeContract>> getTypeContractsByCompany(@PathVariable Long businessId) {
        try {
            List<TypeContract> typeContracts = typeContractRepository.findByBusinessId(businessId);
            return ResponseEntity.ok(typeContracts);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // Endpoint para obtener todas las configuraciones de una vez para el formulario de empleados
    @GetMapping("/all/{businessId}")
    public ResponseEntity<Map<String, Object>> getAllConfigurations(@PathVariable Long businessId) {
        try {
            Map<String, Object> configurations = new HashMap<>();
            
            configurations.put("genders", genderRepository.findAll());
            configurations.put("civilStatuses", civilStatusRepository.findAll());
            configurations.put("etnias", etniaRepository.findAll());
            configurations.put("degrees", degreeRepository.findAll());
            configurations.put("positions", positionRepository.findByBusinessId(businessId));
            configurations.put("departments", departmentRepository.findByBusinessId(businessId));
            configurations.put("typeContracts", typeContractRepository.findByBusinessId(businessId));
            
            return ResponseEntity.ok(configurations);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // Endpoints adicionales para compatibilidad con el frontend Angular
    @GetMapping("/by-ruc/positions/{ruc}")
    public ResponseEntity<List<Position>> getPositionsByRuc(@PathVariable String ruc) {
        try {
            Business business = businessRepository.findByRuc(ruc).orElse(null);
            if (business == null) {
                return ResponseEntity.notFound().build();
            }
            
            List<Position> positions = positionRepository.findByBusinessId(business.getId());
            return ResponseEntity.ok(positions);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/by-ruc/departments/{ruc}")
    public ResponseEntity<List<Department>> getDepartmentsByRuc(@PathVariable String ruc) {
        try {
            Business business = businessRepository.findByRuc(ruc).orElse(null);
            if (business == null) {
                return ResponseEntity.notFound().build();
            }
            
            List<Department> departments = departmentRepository.findByBusinessId(business.getId());
            return ResponseEntity.ok(departments);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/by-ruc/all/{ruc}")
    public ResponseEntity<Map<String, Object>> getAllConfigurationsByRuc(@PathVariable String ruc) {
        try {
            Business business = businessRepository.findByRuc(ruc).orElse(null);
            if (business == null) {
                return ResponseEntity.notFound().build();
            }
            
            Map<String, Object> configurations = new HashMap<>();
            
            configurations.put("genders", genderRepository.findAll());
            configurations.put("civilStatuses", civilStatusRepository.findAll());
            configurations.put("etnias", etniaRepository.findAll());
            configurations.put("degrees", degreeRepository.findAll());
            configurations.put("positions", positionRepository.findByBusinessId(business.getId()));
            configurations.put("departments", departmentRepository.findByBusinessId(business.getId()));
            configurations.put("typeContracts", typeContractRepository.findByBusinessId(business.getId()));
            
            return ResponseEntity.ok(configurations);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // Endpoint para obtener el código IESS de la empresa
    @GetMapping("/iess/business/{businessId}")
    public ResponseEntity<Map<String, Object>> getIessCodeByBusiness(@PathVariable Long businessId) {
        try {
            Business business = businessRepository.findById(businessId).orElse(null);
            if (business == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Obtener el primer código IESS asociado a la empresa
            List<Iess> iessItems = iessRepository.findByBusinessId(businessId);
            Map<String, Object> response = new HashMap<>();
            
            if (!iessItems.isEmpty()) {
                Iess firstIess = iessItems.get(0); // Tomar el primer código
                response.put("id", firstIess.getId());
                response.put("codigoSectorial", firstIess.getCode());
                response.put("descripcion", firstIess.getDescription());
            } else {
                // Si no hay código IESS asociado, devolver valores por defecto o vacíos
                response.put("id", null);
                response.put("codigoSectorial", "");
                response.put("descripcion", "No configurado");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // Endpoint para obtener TODOS los códigos IESS configurados para una empresa
    @GetMapping("/iess/business/{businessId}/all")
    public ResponseEntity<List<Map<String, Object>>> getAllIessCodesByBusiness(@PathVariable Long businessId) {
        try {
            Business business = businessRepository.findById(businessId).orElse(null);
            if (business == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Obtener TODOS los códigos IESS asociados a la empresa
            List<Iess> iessItems = iessRepository.findByBusinessId(businessId);
            List<Map<String, Object>> response = new ArrayList<>();
            
            for (Iess iess : iessItems) {
                Map<String, Object> iessData = new HashMap<>();
                iessData.put("id", iess.getId());
                iessData.put("code", iess.getCode());
                iessData.put("description", iess.getDescription());
                response.add(iessData);
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}