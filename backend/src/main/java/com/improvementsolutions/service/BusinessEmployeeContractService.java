package com.improvementsolutions.service;

import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.BusinessEmployeeContract;
import com.improvementsolutions.repository.BusinessEmployeeContractRepository;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BusinessEmployeeContractService {

    private final BusinessEmployeeContractRepository businessEmployeeContractRepository;
    private final BusinessEmployeeRepository businessEmployeeRepository;

    public List<BusinessEmployeeContract> findAll() {
        return businessEmployeeContractRepository.findAll();
    }

    public Optional<BusinessEmployeeContract> findById(Long id) {
        return businessEmployeeContractRepository.findById(id);
    }

    public List<BusinessEmployeeContract> findByBusinessEmployeeId(Long businessEmployeeId) {
        return businessEmployeeContractRepository.findByBusinessEmployeeId(businessEmployeeId);
    }

    public List<BusinessEmployeeContract> findByBusinessId(Long businessId) {
        return businessEmployeeContractRepository.findByBusinessEmployeeBusinessId(businessId);
    }

    public List<BusinessEmployeeContract> findByBusinessIdAndStatus(Long businessId, String status) {
        return businessEmployeeContractRepository.findByBusinessIdAndStatus(businessId, status);
    }

    public List<BusinessEmployeeContract> findContractsExpiringSoon(Long businessId, LocalDate startDate, LocalDate endDate) {
        return businessEmployeeContractRepository.findContractsExpiringSoon(businessId, startDate, endDate);
    }

    @Transactional
    public BusinessEmployeeContract create(BusinessEmployeeContract contract) {
        BusinessEmployee businessEmployee = businessEmployeeRepository.findById(contract.getBusinessEmployee().getId())
                .orElseThrow(() -> new RuntimeException("Empleado de empresa no encontrado"));
        
        contract.setBusinessEmployee(businessEmployee);
        contract.setStatus("ACTIVO");
        contract.setCreatedAt(LocalDateTime.now());
        contract.setUpdatedAt(LocalDateTime.now());
        
        BusinessEmployeeContract savedContract = businessEmployeeContractRepository.save(contract);
        
        // Si es el primer contrato o si se indica explícitamente, establecerlo como contrato actual
        if (businessEmployee.getCurrentContract() == null) {
            businessEmployee.setCurrentContract(savedContract);
            businessEmployeeRepository.save(businessEmployee);
        }
        
        return savedContract;
    }

    @Transactional
    public BusinessEmployeeContract update(Long id, BusinessEmployeeContract contractDetails) {
        BusinessEmployeeContract contract = businessEmployeeContractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));
        
        contract.setTypeContract(contractDetails.getTypeContract());
        contract.setStartDate(contractDetails.getStartDate());
        contract.setEndDate(contractDetails.getEndDate());
        contract.setSalary(contractDetails.getSalary());
        contract.setDescription(contractDetails.getDescription());
        
        if (contractDetails.getStatus() != null) {
            contract.setStatus(contractDetails.getStatus());
        }
        
        contract.setUpdatedAt(LocalDateTime.now());
        
        return businessEmployeeContractRepository.save(contract);
    }

    @Transactional
    public void delete(Long id) {
        BusinessEmployeeContract contract = businessEmployeeContractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));
        
        // Si este contrato es el contrato actual del empleado, remover la referencia
        BusinessEmployee businessEmployee = contract.getBusinessEmployee();
        if (businessEmployee.getCurrentContract() != null && 
                businessEmployee.getCurrentContract().getId().equals(contract.getId())) {
            businessEmployee.setCurrentContract(null);
            businessEmployeeRepository.save(businessEmployee);
        }
        
        businessEmployeeContractRepository.delete(contract);
    }

    @Transactional
    public void updateStatus(Long id, String status) {
        BusinessEmployeeContract contract = businessEmployeeContractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));
        
        contract.setStatus(status);
        contract.setUpdatedAt(LocalDateTime.now());
        
        // Si el contrato se marca como inactivo y es el contrato actual, actualizar referencia
        if ("INACTIVO".equals(status)) {
            BusinessEmployee businessEmployee = contract.getBusinessEmployee();
            if (businessEmployee.getCurrentContract() != null && 
                    businessEmployee.getCurrentContract().getId().equals(contract.getId())) {
                businessEmployee.setCurrentContract(null);
                businessEmployeeRepository.save(businessEmployee);
            }
        }
        
        businessEmployeeContractRepository.save(contract);
    }

    @Transactional
    public void setAsCurrentContract(Long contractId, Long businessEmployeeId) {
        BusinessEmployee businessEmployee = businessEmployeeRepository.findById(businessEmployeeId)
                .orElseThrow(() -> new RuntimeException("Empleado de empresa no encontrado"));
        
        BusinessEmployeeContract contract = businessEmployeeContractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));
        
        // Verificar que el contrato pertenece al empleado
        if (!contract.getBusinessEmployee().getId().equals(businessEmployeeId)) {
            throw new RuntimeException("El contrato no pertenece a este empleado");
        }
        
        businessEmployee.setCurrentContract(contract);
        businessEmployeeRepository.save(businessEmployee);
    }
}