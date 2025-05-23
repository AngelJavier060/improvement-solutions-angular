package com.improvementsolutions.service;

import com.improvementsolutions.model.Etnia;
import com.improvementsolutions.repository.EtniaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EtniaService {

    private final EtniaRepository etniaRepository;

    public List<Etnia> findAll() {
        return etniaRepository.findAll();
    }

    public Optional<Etnia> findById(Long id) {
        return etniaRepository.findById(id);
    }

    public Optional<Etnia> findByName(String name) {
        return etniaRepository.findByName(name);
    }

    @Transactional
    public Etnia create(Etnia etnia) {
        if (etniaRepository.findByName(etnia.getName()).isPresent()) {
            throw new RuntimeException("Ya existe una etnia con este nombre");
        }
        
        etnia.setCreatedAt(LocalDateTime.now());
        etnia.setUpdatedAt(LocalDateTime.now());
        
        return etniaRepository.save(etnia);
    }

    @Transactional
    public Etnia update(Long id, Etnia etniaDetails) {
        Etnia etnia = etniaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Etnia no encontrada"));
        
        // Verificar si ya existe otra etnia con el mismo nombre
        Optional<Etnia> existingEtnia = etniaRepository.findByName(etniaDetails.getName());
        if (existingEtnia.isPresent() && !existingEtnia.get().getId().equals(id)) {
            throw new RuntimeException("Ya existe una etnia con este nombre");
        }
        
        etnia.setName(etniaDetails.getName());
        etnia.setDescription(etniaDetails.getDescription());
        etnia.setUpdatedAt(LocalDateTime.now());
        
        return etniaRepository.save(etnia);
    }

    @Transactional
    public void delete(Long id) {
        if (!etniaRepository.existsById(id)) {
            throw new RuntimeException("Etnia no encontrada");
        }
        etniaRepository.deleteById(id);
    }
}
