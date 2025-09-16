package com.improvementsolutions.service;

import com.improvementsolutions.model.ContractorCompany;
import com.improvementsolutions.model.ContractorBlock;
import com.improvementsolutions.repository.ContractorCompanyRepository;
import com.improvementsolutions.repository.ContractorBlockRepository;
import com.improvementsolutions.dto.ContractorCompanyDto;
import com.improvementsolutions.dto.ContractorBlockDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContractorCompanyService {

    private final ContractorCompanyRepository contractorCompanyRepository;
    private final ContractorBlockRepository contractorBlockRepository;

    // Método para convertir Entidad a DTO
    private ContractorCompanyDto convertToDto(ContractorCompany company) {
        List<ContractorBlockDto> blockDtos = company.getBlocks().stream()
                .map(this::convertBlockToDto)
                .collect(Collectors.toList());

        return ContractorCompanyDto.builder()
                .id(company.getId())
                .name(company.getName())
                .code(company.getCode())
                .description(company.getDescription())
                .active(company.getActive())
                .createdAt(company.getCreatedAt())
                .updatedAt(company.getUpdatedAt())
                .blocks(blockDtos)
                .totalBlocks((long) blockDtos.size())
                .totalEmployees(contractorCompanyRepository.countEmployeesByCompanyId(company.getId()))
                .build();
    }

    // Método para convertir Entidad Block a DTO
    private ContractorBlockDto convertBlockToDto(ContractorBlock block) {
        return ContractorBlockDto.builder()
                .id(block.getId())
                .name(block.getName())
                .code(block.getCode())
                .description(block.getDescription())
                .active(block.getActive())
                .createdAt(block.getCreatedAt())
                .updatedAt(block.getUpdatedAt())
                .contractorCompanyId(block.getContractorCompany().getId())
                .contractorCompanyName(block.getContractorCompany().getName())
                .totalEmployees(contractorBlockRepository.countEmployeesByBlockId(block.getId()))
                .build();
    }

    // Método para convertir DTO a Entidad
    private ContractorCompany convertToEntity(ContractorCompanyDto dto) {
        ContractorCompany company = new ContractorCompany();
        company.setId(dto.getId());
        company.setName(dto.getName());
        company.setCode(dto.getCode());
        company.setDescription(dto.getDescription());
        company.setActive(dto.getActive() != null ? dto.getActive() : true);
        return company;
    }

    @Transactional(readOnly = true)
    public List<ContractorCompanyDto> getAllCompanies() {
        return contractorCompanyRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ContractorCompanyDto> getAllActiveCompanies() {
        return contractorCompanyRepository.findAllActive().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<ContractorCompanyDto> getCompanyById(Long id) {
        return contractorCompanyRepository.findById(id)
                .map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public Optional<ContractorCompanyDto> getCompanyByName(String name) {
        return contractorCompanyRepository.findByName(name)
                .map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public Optional<ContractorCompanyDto> getCompanyByCode(String code) {
        return contractorCompanyRepository.findByCode(code)
                .map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public List<ContractorCompanyDto> searchCompaniesByName(String name) {
        return contractorCompanyRepository.findByNameContainingIgnoreCase(name).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ContractorCompanyDto createCompany(ContractorCompanyDto dto) {
        // Validar que no exista una empresa con el mismo nombre o código
        if (dto.getName() != null && contractorCompanyRepository.findByName(dto.getName()).isPresent()) {
            throw new IllegalArgumentException("Ya existe una empresa contratista con el nombre: " + dto.getName());
        }
        
        if (dto.getCode() != null && contractorCompanyRepository.findByCode(dto.getCode()).isPresent()) {
            throw new IllegalArgumentException("Ya existe una empresa contratista con el código: " + dto.getCode());
        }

        ContractorCompany company = convertToEntity(dto);
        company.setCreatedAt(LocalDateTime.now());
        company.setUpdatedAt(LocalDateTime.now());
        
        ContractorCompany savedCompany = contractorCompanyRepository.save(company);
        return convertToDto(savedCompany);
    }

    @Transactional
    public Optional<ContractorCompanyDto> updateCompany(Long id, ContractorCompanyDto dto) {
        return contractorCompanyRepository.findById(id)
                .map(existingCompany -> {
                    // Validar que no exista otra empresa con el mismo nombre o código
                    if (dto.getName() != null && !dto.getName().equals(existingCompany.getName())) {
                        contractorCompanyRepository.findByName(dto.getName())
                                .ifPresent(company -> {
                                    if (!company.getId().equals(id)) {
                                        throw new IllegalArgumentException("Ya existe una empresa contratista con el nombre: " + dto.getName());
                                    }
                                });
                    }
                    
                    if (dto.getCode() != null && !dto.getCode().equals(existingCompany.getCode())) {
                        contractorCompanyRepository.findByCode(dto.getCode())
                                .ifPresent(company -> {
                                    if (!company.getId().equals(id)) {
                                        throw new IllegalArgumentException("Ya existe una empresa contratista con el código: " + dto.getCode());
                                    }
                                });
                    }

                    existingCompany.setName(dto.getName());
                    existingCompany.setCode(dto.getCode());
                    existingCompany.setDescription(dto.getDescription());
                    if (dto.getActive() != null) {
                        existingCompany.setActive(dto.getActive());
                    }
                    existingCompany.setUpdatedAt(LocalDateTime.now());
                    
                    ContractorCompany updatedCompany = contractorCompanyRepository.save(existingCompany);
                    return convertToDto(updatedCompany);
                });
    }

    @Transactional
    public boolean deleteCompany(Long id) {
        Optional<ContractorCompany> company = contractorCompanyRepository.findById(id);
        if (company.isPresent()) {
            // Verificar si tiene empleados asociados
            Long employeeCount = contractorCompanyRepository.countEmployeesByCompanyId(id);
            if (employeeCount > 0) {
                throw new IllegalStateException("No se puede eliminar la empresa contratista porque tiene " + employeeCount + " empleados asociados");
            }
            
            contractorCompanyRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Transactional
    public boolean toggleCompanyStatus(Long id) {
        return contractorCompanyRepository.findById(id)
                .map(company -> {
                    company.setActive(!company.getActive());
                    company.setUpdatedAt(LocalDateTime.now());
                    contractorCompanyRepository.save(company);
                    return true;
                })
                .orElse(false);
    }
}