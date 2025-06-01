package com.improvementsolutions.service;

import com.improvementsolutions.model.Department;
import com.improvementsolutions.repository.DepartmentRepository;
import com.improvementsolutions.dto.DepartmentDto; // Asumiendo que este es el DTO correcto
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    // Método para convertir Entidad a DTO
    private DepartmentDto convertToDto(Department department) {
        DepartmentDto dto = new DepartmentDto();
        dto.setId(department.getId());
        dto.setName(department.getName());
        dto.setDescription(department.getDescription());
        dto.setActive(department.getActive()); // Cambiado de isActive() a getActive()
        // Mapear otros campos si es necesario
        return dto;
    }

    // Método para convertir DTO a Entidad
    private Department convertToEntity(DepartmentDto departmentDto) {
        Department department = new Department();
        department.setId(departmentDto.getId());
        department.setName(departmentDto.getName());
        department.setDescription(departmentDto.getDescription());
        department.setActive(departmentDto.getActive()); // Cambiado de isActive() a getActive()
        // Mapear otros campos si es necesario
        return department;
    }

    @Transactional(readOnly = true)
    public List<DepartmentDto> getAllDepartments() {
        return departmentRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<DepartmentDto> getDepartmentById(Long id) {
        return departmentRepository.findById(id)
                .map(this::convertToDto);
    }

    @Transactional
    public DepartmentDto createDepartment(DepartmentDto departmentDto) {
        Department department = convertToEntity(departmentDto);
        department.setCreatedAt(LocalDateTime.now());
        department.setUpdatedAt(LocalDateTime.now());
        // department.setActive(true); // Por defecto o según lógica
        Department savedDepartment = departmentRepository.save(department);
        return convertToDto(savedDepartment);
    }

    @Transactional
    public Optional<DepartmentDto> updateDepartment(Long id, DepartmentDto departmentDto) {
        return departmentRepository.findById(id)
                .map(existingDepartment -> {
                    existingDepartment.setName(departmentDto.getName());
                    existingDepartment.setDescription(departmentDto.getDescription());
                    existingDepartment.setActive(departmentDto.getActive()); // Cambiado de isActive() a getActive()
                    existingDepartment.setUpdatedAt(LocalDateTime.now());
                    // Actualizar otros campos si es necesario
                    Department updatedDepartment = departmentRepository.save(existingDepartment);
                    return convertToDto(updatedDepartment);
                });
    }

    @Transactional
    public boolean deleteDepartment(Long id) {
        if (departmentRepository.existsById(id)) {
            departmentRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
