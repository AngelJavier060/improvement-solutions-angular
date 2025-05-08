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
        contract.setIsCurrent(true);
        contract.setCreatedAt(LocalDateTime.now());
        contract.setUpdatedAt(LocalDateTime.now());
        
        BusinessEmployeeContract savedContract = businessEmployeeContractRepository.save(contract);
        return savedContract;
    }

    @Transactional
    public BusinessEmployeeContract update(Long id, BusinessEmployeeContract contractDetails) {
        BusinessEmployeeContract contract = businessEmployeeContractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));
        
        contract.setTypeContractId(contractDetails.getTypeContractId());
        contract.setStartDate(contractDetails.getStartDate());
        contract.setEndDate(contractDetails.getEndDate());
        contract.setSalary(contractDetails.getSalary());
        contract.setWorkingHours(contractDetails.getWorkingHours());
        contract.setContractFile(contractDetails.getContractFile());
        contract.setIsCurrent(contractDetails.isCurrent());
        contract.setUpdatedAt(LocalDateTime.now());
        
        return businessEmployeeContractRepository.save(contract);
    }

    @Transactional
    public void delete(Long id) {
        BusinessEmployeeContract contract = businessEmployeeContractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));
        businessEmployeeContractRepository.delete(contract);
    }

    @Transactional
    public void updateStatus(Long id, boolean isCurrent) {
        BusinessEmployeeContract contract = businessEmployeeContractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));
        contract.setIsCurrent(isCurrent);
        contract.setUpdatedAt(LocalDateTime.now());
        businessEmployeeContractRepository.save(contract);
    }

    @Transactional
    public void setAsCurrentContract(Long contractId, Long businessEmployeeId) {
        BusinessEmployeeContract contract = businessEmployeeContractRepository.findById(contractId)
                .orElseThrow(() -> new RuntimeException("Contrato no encontrado"));
        List<BusinessEmployeeContract> contracts = businessEmployeeContractRepository.findByBusinessEmployeeId(businessEmployeeId);
        for (BusinessEmployeeContract c : contracts) {
            c.setIsCurrent(c.getId().equals(contractId));
            c.setUpdatedAt(LocalDateTime.now());
            businessEmployeeContractRepository.save(c);
        }
    }
}