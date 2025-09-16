package com.improvementsolutions.service;

import com.improvementsolutions.model.ContractorBlock;
import com.improvementsolutions.model.ContractorCompany;
import com.improvementsolutions.repository.ContractorBlockRepository;
import com.improvementsolutions.repository.ContractorCompanyRepository;
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
public class ContractorBlockService {

    private final ContractorBlockRepository contractorBlockRepository;
    private final ContractorCompanyRepository contractorCompanyRepository;

    // Método para convertir Entidad a DTO
    private ContractorBlockDto convertToDto(ContractorBlock block) {
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
    private ContractorBlock convertToEntity(ContractorBlockDto dto, ContractorCompany company) {
        ContractorBlock block = new ContractorBlock();
        block.setId(dto.getId());
        block.setName(dto.getName());
        block.setCode(dto.getCode());
        block.setDescription(dto.getDescription());
        block.setActive(dto.getActive() != null ? dto.getActive() : true);
        block.setContractorCompany(company);
        return block;
    }

    @Transactional(readOnly = true)
    public List<ContractorBlockDto> getAllBlocks() {
        return contractorBlockRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ContractorBlockDto> getAllActiveBlocks() {
        return contractorBlockRepository.findAllActive().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ContractorBlockDto> getBlocksByCompanyId(Long companyId) {
        return contractorBlockRepository.findByContractorCompanyId(companyId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ContractorBlockDto> getActiveBlocksByCompanyId(Long companyId) {
        return contractorBlockRepository.findActiveByContractorCompanyId(companyId).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<ContractorBlockDto> getBlockById(Long id) {
        return contractorBlockRepository.findById(id)
                .map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public Optional<ContractorBlockDto> getBlockByCode(String code) {
        return contractorBlockRepository.findByCode(code)
                .map(this::convertToDto);
    }

    @Transactional(readOnly = true)
    public List<ContractorBlockDto> searchBlocksByName(String name) {
        return contractorBlockRepository.findByNameContainingIgnoreCase(name).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public ContractorBlockDto createBlock(ContractorBlockDto dto) {
        // Validar que la empresa contratista exista
        ContractorCompany company = contractorCompanyRepository.findById(dto.getContractorCompanyId())
                .orElseThrow(() -> new IllegalArgumentException("No se encontró la empresa contratista con ID: " + dto.getContractorCompanyId()));

        // Validar que no exista un bloque con el mismo nombre en la misma empresa
        if (dto.getName() != null) {
            contractorBlockRepository.findByNameAndContractorCompanyId(dto.getName(), dto.getContractorCompanyId())
                    .ifPresent(block -> {
                        throw new IllegalArgumentException("Ya existe un bloque con el nombre '" + dto.getName() + "' en la empresa " + company.getName());
                    });
        }

        // Validar que no exista un bloque con el mismo código
        if (dto.getCode() != null && contractorBlockRepository.findByCode(dto.getCode()).isPresent()) {
            throw new IllegalArgumentException("Ya existe un bloque con el código: " + dto.getCode());
        }

        ContractorBlock block = convertToEntity(dto, company);
        block.setCreatedAt(LocalDateTime.now());
        block.setUpdatedAt(LocalDateTime.now());
        
        ContractorBlock savedBlock = contractorBlockRepository.save(block);
        return convertToDto(savedBlock);
    }

    @Transactional
    public Optional<ContractorBlockDto> updateBlock(Long id, ContractorBlockDto dto) {
        return contractorBlockRepository.findById(id)
                .map(existingBlock -> {
                    // Validar que no exista otro bloque con el mismo nombre en la misma empresa
                    if (dto.getName() != null && !dto.getName().equals(existingBlock.getName())) {
                        contractorBlockRepository.findByNameAndContractorCompanyId(
                                dto.getName(), 
                                existingBlock.getContractorCompany().getId()
                        ).ifPresent(block -> {
                            if (!block.getId().equals(id)) {
                                throw new IllegalArgumentException("Ya existe un bloque con el nombre '" + dto.getName() + "' en esta empresa");
                            }
                        });
                    }
                    
                    // Validar que no exista otro bloque con el mismo código
                    if (dto.getCode() != null && !dto.getCode().equals(existingBlock.getCode())) {
                        contractorBlockRepository.findByCode(dto.getCode())
                                .ifPresent(block -> {
                                    if (!block.getId().equals(id)) {
                                        throw new IllegalArgumentException("Ya existe un bloque con el código: " + dto.getCode());
                                    }
                                });
                    }

                    existingBlock.setName(dto.getName());
                    existingBlock.setCode(dto.getCode());
                    existingBlock.setDescription(dto.getDescription());
                    if (dto.getActive() != null) {
                        existingBlock.setActive(dto.getActive());
                    }
                    existingBlock.setUpdatedAt(LocalDateTime.now());
                    
                    ContractorBlock updatedBlock = contractorBlockRepository.save(existingBlock);
                    return convertToDto(updatedBlock);
                });
    }

    @Transactional
    public boolean deleteBlock(Long id) {
        Optional<ContractorBlock> block = contractorBlockRepository.findById(id);
        if (block.isPresent()) {
            // Verificar si tiene empleados asociados
            Long employeeCount = contractorBlockRepository.countEmployeesByBlockId(id);
            if (employeeCount > 0) {
                throw new IllegalStateException("No se puede eliminar el bloque porque tiene " + employeeCount + " empleados asociados");
            }
            
            contractorBlockRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Transactional
    public boolean toggleBlockStatus(Long id) {
        return contractorBlockRepository.findById(id)
                .map(block -> {
                    block.setActive(!block.getActive());
                    block.setUpdatedAt(LocalDateTime.now());
                    contractorBlockRepository.save(block);
                    return true;
                })
                .orElse(false);
    }
}