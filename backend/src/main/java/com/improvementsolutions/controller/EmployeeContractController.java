package com.improvementsolutions.controller;

import com.improvementsolutions.model.BusinessEmployeeContract;
import com.improvementsolutions.model.BusinessEmployeeContractFile;
import com.improvementsolutions.dto.EmployeeContractResponse;
import com.improvementsolutions.service.BusinessEmployeeContractService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"})
@Slf4j
public class EmployeeContractController {

    private final BusinessEmployeeContractService contractService;

    @GetMapping("/contract/{cedula}/cedula")
    public ResponseEntity<List<EmployeeContractResponse>> getContractsByCedula(@PathVariable String cedula) {
        try {
            List<BusinessEmployeeContract> list = contractService.getByEmployeeCedula(cedula);
            return ResponseEntity.ok(list.stream().map(this::toResponse).toList());
        } catch (Exception e) {
            log.error("Error obteniendo contratos por cédula {}: {}", cedula, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping(value = "/employee_contract", consumes = {"multipart/form-data"})
    public ResponseEntity<EmployeeContractResponse> createContract(
            @RequestParam("business_employee_id") Long businessEmployeeId,
            @RequestParam("type_contract_id") Long typeContractId,
            @RequestParam(value = "position_id", required = false) Long positionId,
            @RequestParam(value = "department_id", required = false) Long departmentId,
            @RequestParam(value = "start_date") @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(value = "end_date", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate,
            @RequestParam(value = "salary", required = false) BigDecimal salary,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "files[]", required = false) MultipartFile[] files
    ) {
        try {
            List<MultipartFile> fileList = files != null ? Arrays.asList(files) : List.of();
            BusinessEmployeeContract created = contractService.create(
                    businessEmployeeId,
                    typeContractId,
                    positionId,
                    departmentId,
                    startDate,
                    endDate,
                    salary,
                    description,
                    fileList
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
        } catch (IllegalArgumentException ex) {
            log.error("Error de validación al crear contrato: {}", ex.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error interno al crear contrato: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/employee_contract/{id}")
    public ResponseEntity<Void> deleteContract(@PathVariable Long id) {
        try {
            contractService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    private EmployeeContractResponse toResponse(BusinessEmployeeContract c) {
        EmployeeContractResponse resp = new EmployeeContractResponse();
        resp.setId(c.getId());
        resp.setBusiness_employee_id(c.getBusinessEmployee() != null ? c.getBusinessEmployee().getId() : null);
        if (c.getTypeContract() != null) {
            resp.setType_contract(new EmployeeContractResponse.Ref(c.getTypeContract().getId(), c.getTypeContract().getName()));
        }
        if (c.getPosition() != null) {
            resp.setPosition(new EmployeeContractResponse.Ref(c.getPosition().getId(), c.getPosition().getName()));
        }
        if (c.getDepartment() != null) {
            resp.setDepartment(new EmployeeContractResponse.Ref(c.getDepartment().getId(), c.getDepartment().getName()));
        }
        resp.setStart_date(c.getStartDate());
        resp.setEnd_date(c.getEndDate());
        resp.setSalary(c.getSalary());
        resp.setDescription(c.getDescription());
        java.util.List<EmployeeContractResponse.ContractFileResponse> files = new java.util.ArrayList<>();
        if (c.getFiles() != null) {
            for (BusinessEmployeeContractFile f : c.getFiles()) {
                String rel = f.getFilePath(); // e.g., employee-contracts/uuid.pdf
                String dir = rel;
                String name = rel;
                int idx = rel != null ? rel.lastIndexOf('/') : -1;
                if (idx > 0) {
                    dir = rel.substring(0, idx);
                    name = rel.substring(idx + 1);
                } else {
                    dir = "";
                    name = rel;
                }
                String publicUrl = "/api/files/" + (dir.isEmpty() ? name : ("download/" + dir + "/" + name));
                files.add(new EmployeeContractResponse.ContractFileResponse(
                        f.getId(),
                        publicUrl,
                        f.getFileName(),
                        f.getFileType()
                ));
            }
        }
        resp.setFiles(files);
        return resp;
    }
}
