package com.improvementsolutions.service;

import com.improvementsolutions.model.ResidentAddress;
import com.improvementsolutions.repository.ResidentAddressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ResidentAddressService {

    private final ResidentAddressRepository residentAddressRepository;

    public List<ResidentAddress> findAll() {
        return residentAddressRepository.findAll();
    }

    public Optional<ResidentAddress> findById(Long id) {
        return residentAddressRepository.findById(id);
    }

    public Optional<ResidentAddress> findByName(String name) {
        return residentAddressRepository.findByName(name);
    }

    @Transactional
    public ResidentAddress create(ResidentAddress residentAddress) {
        if (residentAddressRepository.findByName(residentAddress.getName()).isPresent()) {
            throw new RuntimeException("Ya existe una dirección de residencia con este nombre");
        }
        
        residentAddress.setCreatedAt(LocalDateTime.now());
        residentAddress.setUpdatedAt(LocalDateTime.now());
        
        return residentAddressRepository.save(residentAddress);
    }

    @Transactional
    public ResidentAddress update(Long id, ResidentAddress residentAddressDetails) {
        ResidentAddress residentAddress = residentAddressRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dirección de residencia no encontrada"));
        
        // Verificar si ya existe otra dirección con el mismo nombre
        Optional<ResidentAddress> existingAddress = residentAddressRepository.findByName(residentAddressDetails.getName());
        if (existingAddress.isPresent() && !existingAddress.get().getId().equals(id)) {
            throw new RuntimeException("Ya existe una dirección de residencia con este nombre");
        }
        
        residentAddress.setName(residentAddressDetails.getName());
        residentAddress.setDescription(residentAddressDetails.getDescription());
        residentAddress.setUpdatedAt(LocalDateTime.now());
        
        return residentAddressRepository.save(residentAddress);
    }

    @Transactional
    public void delete(Long id) {
        if (!residentAddressRepository.existsById(id)) {
            throw new RuntimeException("Dirección de residencia no encontrada");
        }
        residentAddressRepository.deleteById(id);
    }
}