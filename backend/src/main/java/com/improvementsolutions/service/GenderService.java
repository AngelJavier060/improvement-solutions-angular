package com.improvementsolutions.service;

import com.improvementsolutions.model.Gender;
import com.improvementsolutions.repository.GenderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GenderService {

    private final GenderRepository genderRepository;

    public List<Gender> findAll() {
        return genderRepository.findAll();
    }

    public Optional<Gender> findById(Long id) {
        return genderRepository.findById(id);
    }

    public Optional<Gender> findByName(String name) {
        return genderRepository.findByName(name);
    }

    @Transactional
    public Gender create(Gender gender) {
        if (genderRepository.findByName(gender.getName()).isPresent()) {
            throw new RuntimeException("Ya existe un género con este nombre");
        }
        
        gender.setCreatedAt(LocalDateTime.now());
        gender.setUpdatedAt(LocalDateTime.now());
        
        return genderRepository.save(gender);
    }

    @Transactional
    public Gender update(Long id, Gender genderDetails) {
        Gender gender = genderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Género no encontrado"));
        
        // Verificar si ya existe otro género con el mismo nombre
        Optional<Gender> existingGender = genderRepository.findByName(genderDetails.getName());
        if (existingGender.isPresent() && !existingGender.get().getId().equals(id)) {
            throw new RuntimeException("Ya existe un género con este nombre");
        }
        
        gender.setName(genderDetails.getName());
        gender.setDescription(genderDetails.getDescription());
        gender.setUpdatedAt(LocalDateTime.now());
        
        return genderRepository.save(gender);
    }

    @Transactional
    public void delete(Long id) {
        if (!genderRepository.existsById(id)) {
            throw new RuntimeException("Género no encontrado");
        }
        genderRepository.deleteById(id);
    }
}