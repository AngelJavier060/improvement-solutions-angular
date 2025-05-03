package com.improvementsolutions.service;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.Employee;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BusinessEmployeeService {

    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final BusinessRepository businessRepository;
    private final EmployeeRepository employeeRepository;

    public List<BusinessEmployee> findAll() {
        return businessEmployeeRepository.findAll();
    }

    public List<BusinessEmployee> findByBusinessId(Long businessId) {
        return businessEmployeeRepository.findByBusinessId(businessId);
    }

    public Optional<BusinessEmployee> findById(Long id) {
        return businessEmployeeRepository.findById(id);
    }

    public List<BusinessEmployee> findByBusinessIdAndStatus(Long businessId, String status) {
        return businessEmployeeRepository.findByBusinessIdAndStatus(businessId, status);
    }

    public Optional<BusinessEmployee> findByBusinessIdAndCedula(Long businessId, String cedula) {
        return businessEmployeeRepository.findByBusinessIdAndCedula(businessId, cedula);
    }

    public List<BusinessEmployee> searchByBusinessIdAndNameOrCedula(Long businessId, String searchTerm) {
        return businessEmployeeRepository.searchByBusinessIdAndNameOrCedula(businessId, searchTerm);
    }

    @Transactional
    public BusinessEmployee create(BusinessEmployee businessEmployee) {
        Business business = businessRepository.findById(businessEmployee.getBusiness().getId())
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        Employee employee;
        
        // Verificar si ya existe un empleado con esa cédula
        Optional<Employee> existingEmployee = employeeRepository.findByCedula(businessEmployee.getCedula());
        
        if (existingEmployee.isPresent()) {
            employee = existingEmployee.get();
        } else {
            // Crear nuevo empleado
            employee = new Employee();
            employee.setCedula(businessEmployee.getCedula());
            employee.setName(businessEmployee.getName());
            employee.setStatus("ACTIVO");
            employee.setCreatedAt(LocalDateTime.now());
            employee.setUpdatedAt(LocalDateTime.now());
            employee = employeeRepository.save(employee);
        }
        
        // Verificar si el empleado ya está registrado en esta empresa
        if (businessEmployeeRepository.existsByBusinessIdAndCedula(business.getId(), businessEmployee.getCedula())) {
            throw new RuntimeException("El empleado ya está registrado en esta empresa");
        }
        
        businessEmployee.setBusiness(business);
        businessEmployee.setEmployee(employee);
        businessEmployee.setStatus("ACTIVO");
        businessEmployee.setCreatedAt(LocalDateTime.now());
        businessEmployee.setUpdatedAt(LocalDateTime.now());
        
        return businessEmployeeRepository.save(businessEmployee);
    }

    @Transactional
    public BusinessEmployee update(Long id, BusinessEmployee businessEmployeeDetails) {
        BusinessEmployee businessEmployee = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empleado de empresa no encontrado"));
        
        businessEmployee.setName(businessEmployeeDetails.getName());
        businessEmployee.setPhone(businessEmployeeDetails.getPhone());
        businessEmployee.setBirthdate(businessEmployeeDetails.getBirthdate());
        businessEmployee.setAddress(businessEmployeeDetails.getAddress());
        businessEmployee.setEmail(businessEmployeeDetails.getEmail());
        businessEmployee.setContactKinship(businessEmployeeDetails.getContactKinship());
        businessEmployee.setContactName(businessEmployeeDetails.getContactName());
        businessEmployee.setContactPhone(businessEmployeeDetails.getContactPhone());
        
        if (businessEmployeeDetails.getPosition() != null) {
            businessEmployee.setPosition(businessEmployeeDetails.getPosition());
        }
        
        if (businessEmployeeDetails.getGender() != null) {
            businessEmployee.setGender(businessEmployeeDetails.getGender());
        }
        
        if (businessEmployeeDetails.getEtnia() != null) {
            businessEmployee.setEtnia(businessEmployeeDetails.getEtnia());
        }
        
        if (businessEmployeeDetails.getCivilStatus() != null) {
            businessEmployee.setCivilStatus(businessEmployeeDetails.getCivilStatus());
        }
        
        if (businessEmployeeDetails.getResidentAddress() != null) {
            businessEmployee.setResidentAddress(businessEmployeeDetails.getResidentAddress());
        }
        
        if (businessEmployeeDetails.getDegree() != null) {
            businessEmployee.setDegree(businessEmployeeDetails.getDegree());
        }
        
        if (businessEmployeeDetails.getIess() != null) {
            businessEmployee.setIess(businessEmployeeDetails.getIess());
        }
        
        if (businessEmployeeDetails.getStatus() != null) {
            businessEmployee.setStatus(businessEmployeeDetails.getStatus());
        }
        
        if (businessEmployeeDetails.getImage() != null && !businessEmployeeDetails.getImage().isEmpty()) {
            businessEmployee.setImage(businessEmployeeDetails.getImage());
        }
        
        businessEmployee.setUpdatedAt(LocalDateTime.now());
        
        return businessEmployeeRepository.save(businessEmployee);
    }

    @Transactional
    public void delete(Long id) {
        BusinessEmployee businessEmployee = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empleado de empresa no encontrado"));
        
        businessEmployeeRepository.delete(businessEmployee);
    }

    @Transactional
    public void updateStatus(Long id, String status) {
        BusinessEmployee businessEmployee = businessEmployeeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empleado de empresa no encontrado"));
        
        businessEmployee.setStatus(status);
        businessEmployee.setUpdatedAt(LocalDateTime.now());
        
        businessEmployeeRepository.save(businessEmployee);
    }
}