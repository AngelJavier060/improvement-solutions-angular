package com.improvementsolutions.service;

import com.improvementsolutions.dto.CivilStatusDto;
import com.improvementsolutions.exception.ResourceNotFoundException;
import com.improvementsolutions.model.CivilStatus;
import com.improvementsolutions.repository.CivilStatusRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CivilStatusService {

    private final CivilStatusRepository civilStatusRepository;

    @Autowired
    public CivilStatusService(CivilStatusRepository civilStatusRepository) {
        this.civilStatusRepository = civilStatusRepository;
    }

    public List<CivilStatusDto> getAllCivilStatuses() {
        return civilStatusRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public CivilStatusDto getCivilStatusById(Long id) {
        Optional<CivilStatus> optionalCivilStatus = civilStatusRepository.findById(id);
        if (optionalCivilStatus.isEmpty()) {
            throw new ResourceNotFoundException("Estado civil no encontrado con id: " + id);
        }
        return convertToDTO(optionalCivilStatus.get());
    }

    public CivilStatusDto createCivilStatus(CivilStatusDto civilStatusDto) {
        CivilStatus civilStatus = convertToEntity(civilStatusDto);
        civilStatus.setCreatedAt(LocalDateTime.now());
        civilStatus.setUpdatedAt(LocalDateTime.now());
        CivilStatus savedCivilStatus = civilStatusRepository.save(civilStatus);
        return convertToDTO(savedCivilStatus);
    }

    public CivilStatusDto updateCivilStatus(Long id, CivilStatusDto civilStatusDto) {
        Optional<CivilStatus> optionalCivilStatus = civilStatusRepository.findById(id);
        if (optionalCivilStatus.isEmpty()) {
            throw new ResourceNotFoundException("Estado civil no encontrado con id: " + id);
        }
        
        CivilStatus existingCivilStatus = optionalCivilStatus.get();
        existingCivilStatus.setName(civilStatusDto.getName());
        existingCivilStatus.setDescription(civilStatusDto.getDescription());
        existingCivilStatus.setUpdatedAt(LocalDateTime.now());
        
        CivilStatus updatedCivilStatus = civilStatusRepository.save(existingCivilStatus);
        return convertToDTO(updatedCivilStatus);
    }

    public void deleteCivilStatus(Long id) {
        if (!civilStatusRepository.existsById(id)) {
            throw new ResourceNotFoundException("Estado civil no encontrado con id: " + id);
        }
        civilStatusRepository.deleteById(id);
    }

    private CivilStatusDto convertToDTO(CivilStatus civilStatus) {
        CivilStatusDto dto = new CivilStatusDto();
        dto.setId(civilStatus.getId());
        dto.setName(civilStatus.getName());
        dto.setDescription(civilStatus.getDescription());
        dto.setCreatedAt(civilStatus.getCreatedAt());
        dto.setUpdatedAt(civilStatus.getUpdatedAt());
        return dto;
    }

    private CivilStatus convertToEntity(CivilStatusDto dto) {
        CivilStatus civilStatus = new CivilStatus();
        // No establecemos el ID para creación, JPA se encargará
        if (dto.getId() != null) {
            civilStatus.setId(dto.getId());
        }
        civilStatus.setName(dto.getName());
        civilStatus.setDescription(dto.getDescription());
        return civilStatus;
    }
}
