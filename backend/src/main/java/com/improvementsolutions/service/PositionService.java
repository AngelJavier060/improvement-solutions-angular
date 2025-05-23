package com.improvementsolutions.service;

import com.improvementsolutions.model.Position;
import com.improvementsolutions.repository.PositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PositionService {

    private final PositionRepository positionRepository;

    public List<Position> findAll() {
        return positionRepository.findAll();
    }

    public Optional<Position> findById(Long id) {
        return positionRepository.findById(id);
    }

    public Optional<Position> findByName(String name) {
        return positionRepository.findByName(name);
    }

    public List<Position> findByBusinessId(Long businessId) {
        return positionRepository.findByBusinessId(businessId);
    }

    @Transactional
    public Position create(Position position) {
        if (positionRepository.findByName(position.getName()).isPresent()) {
            throw new RuntimeException("Ya existe un cargo con este nombre");
        }
        
        position.setCreatedAt(LocalDateTime.now());
        position.setUpdatedAt(LocalDateTime.now());
        
        return positionRepository.save(position);
    }

    @Transactional
    public Position update(Long id, Position positionDetails) {
        Position position = positionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cargo no encontrado"));
        
        // Verificar si ya existe otro cargo con el mismo nombre
        Optional<Position> existingPosition = positionRepository.findByName(positionDetails.getName());
        if (existingPosition.isPresent() && !existingPosition.get().getId().equals(id)) {
            throw new RuntimeException("Ya existe un cargo con este nombre");
        }
        
        position.setName(positionDetails.getName());
        position.setDescription(positionDetails.getDescription());
        position.setUpdatedAt(LocalDateTime.now());
        
        return positionRepository.save(position);
    }

    @Transactional
    public void delete(Long id) {
        if (!positionRepository.existsById(id)) {
            throw new RuntimeException("Cargo no encontrado");
        }
        positionRepository.deleteById(id);
    }
}
