package com.improvementsolutions.service;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.BusinessEmployeeContractRepository;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.repository.DepartmentRepository;
import com.improvementsolutions.repository.PositionRepository;
import com.improvementsolutions.repository.TypeContractRepository;
import com.improvementsolutions.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessEmployeeContractService {

    private final BusinessEmployeeContractRepository contractRepository;
    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final TypeContractRepository typeContractRepository;
    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;
    private final StorageService storageService;

    @Transactional(readOnly = true)
    public List<BusinessEmployeeContract> getByEmployeeCedula(String cedula) {
        return contractRepository.findByEmployeeCedula(cedula);
    }

    @Transactional
    public BusinessEmployeeContract create(Long businessEmployeeId,
                                           Long typeContractId,
                                           Long positionId,
                                           Long departmentId,
                                           LocalDate startDate,
                                           LocalDate endDate,
                                           BigDecimal salary,
                                           String description,
                                           List<MultipartFile> files) {
        BusinessEmployee be = businessEmployeeRepository.findById(businessEmployeeId)
                .orElseThrow(() -> new IllegalArgumentException("BusinessEmployee no encontrado: " + businessEmployeeId));
        TypeContract tc = typeContractRepository.findById(typeContractId)
                .orElseThrow(() -> new IllegalArgumentException("Tipo de contrato no encontrado: " + typeContractId));

        BusinessEmployeeContract contract = new BusinessEmployeeContract();
        contract.setBusinessEmployee(be);
        contract.setTypeContract(tc);
        if (positionId != null) {
            Position pos = positionRepository.findById(positionId).orElse(null);
            contract.setPosition(pos);
        }
        if (departmentId != null) {
            Department dep = departmentRepository.findById(departmentId).orElse(null);
            contract.setDepartment(dep);
        }
        contract.setStartDate(startDate);
        contract.setEndDate(endDate);
        contract.setSalary(salary);
        contract.setDescription(description);
        contract = contractRepository.save(contract);

        if (files != null) {
            contract.setFiles(new ArrayList<>());
            for (MultipartFile f : files) {
                if (f != null && !f.isEmpty()) {
                    String storedPath = storeFile("employee-contracts", f);
                    BusinessEmployeeContractFile ff = new BusinessEmployeeContractFile();
                    ff.setContract(contract);
                    ff.setFilePath(storedPath); // relative path like employee-contracts/uuid.pdf
                    ff.setFileName(f.getOriginalFilename());
                    ff.setFileType(f.getContentType());
                    contract.getFiles().add(ff);
                }
            }
        }

        return contractRepository.save(contract);
    }

    @Transactional
    public void delete(Long id) {
        if (!contractRepository.existsById(id)) {
            throw new IllegalArgumentException("Contrato no encontrado: " + id);
        }
        contractRepository.deleteById(id);
    }

    private String storeFile(String directory, MultipartFile file) {
        try {
            String originalFilename = file.getOriginalFilename();
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf('.'));
            }
            String unique = java.util.UUID.randomUUID().toString() + ext;
            String stored = storageService.store(directory, file, unique);
            return stored;
        } catch (Exception e) {
            log.error("Error almacenando archivo de contrato: {}", e.getMessage());
            throw new RuntimeException("No se pudo almacenar el archivo: " + e.getMessage());
        }
    }
}
