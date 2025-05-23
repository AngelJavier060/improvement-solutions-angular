package com.improvementsolutions.service;

import com.improvementsolutions.dto.DegreeDto;
import com.improvementsolutions.exception.ResourceNotFoundException;
import com.improvementsolutions.model.Degree;
import com.improvementsolutions.repository.DegreeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DegreeService {

    private final DegreeRepository degreeRepository;

    @Autowired
    public DegreeService(DegreeRepository degreeRepository) {
        this.degreeRepository = degreeRepository;
    }

    public List<DegreeDto> getAllDegrees() {
        return degreeRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public DegreeDto getDegreeById(Long id) {
        Optional<Degree> optionalDegree = degreeRepository.findById(id);
        if (optionalDegree.isEmpty()) {
            throw new ResourceNotFoundException("Estudio no encontrado con id: " + id);
        }
        return convertToDTO(optionalDegree.get());
    }

    public DegreeDto createDegree(DegreeDto degreeDto) {
        Degree degree = convertToEntity(degreeDto);
        degree.setCreatedAt(LocalDateTime.now());
        degree.setUpdatedAt(LocalDateTime.now());
        Degree savedDegree = degreeRepository.save(degree);
        return convertToDTO(savedDegree);
    }

    public DegreeDto updateDegree(Long id, DegreeDto degreeDto) {
        Optional<Degree> optionalDegree = degreeRepository.findById(id);
        if (optionalDegree.isEmpty()) {
            throw new ResourceNotFoundException("Estudio no encontrado con id: " + id);
        }
        
        Degree existingDegree = optionalDegree.get();
        existingDegree.setName(degreeDto.getName());
        existingDegree.setDescription(degreeDto.getDescription());
        existingDegree.setUpdatedAt(LocalDateTime.now());
        
        Degree updatedDegree = degreeRepository.save(existingDegree);
        return convertToDTO(updatedDegree);
    }

    public void deleteDegree(Long id) {
        if (!degreeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Estudio no encontrado con id: " + id);
        }
        degreeRepository.deleteById(id);
    }

    private DegreeDto convertToDTO(Degree degree) {
        DegreeDto dto = new DegreeDto();
        dto.setId(degree.getId());
        dto.setName(degree.getName());
        dto.setDescription(degree.getDescription());
        dto.setCreatedAt(degree.getCreatedAt());
        dto.setUpdatedAt(degree.getUpdatedAt());
        return dto;
    }

    private Degree convertToEntity(DegreeDto dto) {
        Degree degree = new Degree();
        // No establecemos el ID para creación, JPA se encargará
        if (dto.getId() != null) {
            degree.setId(dto.getId());
        }
        degree.setName(dto.getName());
        degree.setDescription(dto.getDescription());
        return degree;
    }
}
