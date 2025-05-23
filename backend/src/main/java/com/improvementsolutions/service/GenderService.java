package com.improvementsolutions.service;

import com.improvementsolutions.dto.GenderDTO;
import com.improvementsolutions.exception.ResourceNotFoundException;
import com.improvementsolutions.model.Gender;
import com.improvementsolutions.repository.GenderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GenderService {

    private final GenderRepository genderRepository;

    @Autowired
    public GenderService(GenderRepository genderRepository) {
        this.genderRepository = genderRepository;
    }

    public List<GenderDTO> getAllGenders() {
        return genderRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public GenderDTO getGenderById(Long id) {
        Optional<Gender> optionalGender = genderRepository.findById(id);
        if (!optionalGender.isPresent()) {
            throw new ResourceNotFoundException("Género no encontrado con id: " + id);
        }
        return convertToDTO(optionalGender.get());
    }

    public GenderDTO createGender(GenderDTO genderDTO) {
        Gender gender = convertToEntity(genderDTO);
        Gender savedGender = genderRepository.save(gender);
        return convertToDTO(savedGender);
    }

    public GenderDTO updateGender(Long id, GenderDTO genderDTO) {
        Optional<Gender> optionalGender = genderRepository.findById(id);
        if (!optionalGender.isPresent()) {
            throw new ResourceNotFoundException("Género no encontrado con id: " + id);
        }
        
        Gender existingGender = optionalGender.get();
        existingGender.setName(genderDTO.getName());
        existingGender.setDescription(genderDTO.getDescription());
        
        Gender updatedGender = genderRepository.save(existingGender);
        return convertToDTO(updatedGender);
    }

    public void deleteGender(Long id) {
        if (!genderRepository.existsById(id)) {
            throw new ResourceNotFoundException("Género no encontrado con id: " + id);
        }
        genderRepository.deleteById(id);
    }

    private GenderDTO convertToDTO(Gender gender) {
        GenderDTO dto = new GenderDTO();
        dto.setId(gender.getId());
        dto.setName(gender.getName());
        dto.setDescription(gender.getDescription());
        dto.setCreatedAt(gender.getCreatedAt());
        dto.setUpdatedAt(gender.getUpdatedAt());
        return dto;
    }

    private Gender convertToEntity(GenderDTO dto) {
        Gender gender = new Gender();
        // No establecemos el ID para creación, JPA se encargará
        if (dto.getId() != null) {
            gender.setId(dto.getId());
        }
        gender.setName(dto.getName());
        gender.setDescription(dto.getDescription());
        // Los timestamps se manejan automáticamente con @PrePersist y @PreUpdate
        return gender;
    }
}
