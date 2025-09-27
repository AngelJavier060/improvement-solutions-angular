package com.improvementsolutions.controller;

import com.improvementsolutions.model.Position;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.PositionRepository;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.repository.BusinessEmployeeContractRepository;
import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.BusinessEmployeeContract;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.time.LocalDateTime;

import com.improvementsolutions.model.Department;

@RestController
@RequestMapping("/api/master-data/positions")
@RequiredArgsConstructor
public class PositionAdminController {

    private final PositionRepository positionRepository;
    private final BusinessRepository businessRepository;
    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final BusinessEmployeeContractRepository contractRepository;

    @PostMapping("/{id}/detach-and-delete")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> detachAndDelete(@PathVariable Long id) {
        Optional<Position> posOpt = positionRepository.findById(id);
        if (posOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        // 1) Detach from all businesses (join table business_position)
        try {
            List<com.improvementsolutions.model.Business> businesses = businessRepository.findByPositionId(id);
            for (com.improvementsolutions.model.Business b : businesses) {
                b.getPositions().removeIf(p -> p != null && id.equals(p.getId()));
                businessRepository.save(b);
            }

            // 1b) Detach from BusinessEmployee.positionEntity
            List<BusinessEmployee> employees = businessEmployeeRepository.findByPositionEntityId(id);
            for (BusinessEmployee be : employees) {
                be.setPositionEntity(null);
                // updatedAt handled by entity listener on update
                businessEmployeeRepository.save(be);
            }

            // 1c) Detach from BusinessEmployeeContract.position
            List<BusinessEmployeeContract> contracts = contractRepository.findByPositionId(id);
            for (BusinessEmployeeContract c : contracts) {
                c.setPosition(null);
                contractRepository.save(c);
            }
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("title", "Error al desasociar");
            body.put("message", "No se pudieron desasociar todas las relaciones del cargo antes del borrado");
            body.put("code", "DETACH_ERROR");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
        }
        // 2) Delete position
        try {
            positionRepository.deleteById(id);
            return ResponseEntity.ok().build();
        } catch (DataIntegrityViolationException dive) {
            Map<String, Object> body = new HashMap<>();
            body.put("title", "No se puede eliminar");
            body.put("message", "El cargo sigue en uso por otros registros (por ejemplo, contratos). Desactive el cargo o actualice los contratos.");
            body.put("code", "ENTITY_IN_USE");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("title", "Error interno del servidor");
            body.put("message", "Se produjo un error al procesar la solicitud");
            body.put("code", "INTERNAL_ERROR");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
        }
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> patchPosition(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Optional<Position> posOpt = positionRepository.findById(id);
        if (posOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Position pos = posOpt.get();

        try {
            if (body.containsKey("name")) {
                Object v = body.get("name");
                if (v instanceof String) pos.setName((String) v);
            }
            if (body.containsKey("description")) {
                Object v = body.get("description");
                if (v instanceof String) pos.setDescription((String) v);
            }
            if (body.containsKey("active")) {
                Object v = body.get("active");
                if (v instanceof Boolean) pos.setActive((Boolean) v);
            }
            // department can come as { id: number } or departmentId: number
            if (body.containsKey("departmentId")) {
                Object v = body.get("departmentId");
                if (v instanceof Number) {
                    Department d = new Department();
                    d.setId(((Number) v).longValue());
                    pos.setDepartment(d);
                } else if (v == null) {
                    pos.setDepartment(null);
                }
            } else if (body.containsKey("department")) {
                Object v = body.get("department");
                if (v instanceof Map) {
                    Object idObj = ((Map<?, ?>) v).get("id");
                    if (idObj instanceof Number) {
                        Department d = new Department();
                        d.setId(((Number) idObj).longValue());
                        pos.setDepartment(d);
                    } else if (idObj == null) {
                        pos.setDepartment(null);
                    }
                } else if (v == null) {
                    pos.setDepartment(null);
                }
            }

            pos.setUpdatedAt(LocalDateTime.now());
            Position saved = positionRepository.save(pos);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("title", "Error al actualizar el cargo");
            err.put("message", e.getMessage());
            err.put("code", "UPDATE_ERROR");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(err);
        }
    }
}
