package com.improvementsolutions.service;

import com.improvementsolutions.model.TypeContract;
import com.improvementsolutions.repository.TypeContractRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TypeContractService {

    private final TypeContractRepository typeContractRepository;

    public List<TypeContract> findAll() {
        return typeContractRepository.findAll();
    }

    public Optional<TypeContract> findById(Long id) {
        return typeContractRepository.findById(id);
    }

    public Optional<TypeContract> findByName(String name) {
        return typeContractRepository.findByName(name);
    }

    public List<TypeContract> findByBusinessId(Long businessId) {
        return typeContractRepository.findByBusinessId(businessId);
    }

    @Transactional
    public TypeContract create(TypeContract typeContract) {
        if (typeContractRepository.findByName(typeContract.getName()).isPresent()) {
            throw new RuntimeException("Ya existe un tipo de contrato con este nombre");
        }
        
        typeContract.setCreatedAt(LocalDateTime.now());
        typeContract.setUpdatedAt(LocalDateTime.now());
        
        return typeContractRepository.save(typeContract);
    }

    @Transactional
    public TypeContract update(Long id, TypeContract typeContractDetails) {
        TypeContract typeContract = typeContractRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tipo de contrato no encontrado"));
        
        // Verificar si ya existe otro tipo de contrato con el mismo nombre
        Optional<TypeContract> existingTypeContract = typeContractRepository.findByName(typeContractDetails.getName());
        if (existingTypeContract.isPresent() && !existingTypeContract.get().getId().equals(id)) {
            throw new RuntimeException("Ya existe un tipo de contrato con este nombre");
        }
        
        typeContract.setName(typeContractDetails.getName());
        typeContract.setDescription(typeContractDetails.getDescription());
        typeContract.setUpdatedAt(LocalDateTime.now());
        
        return typeContractRepository.save(typeContract);
    }

    @Transactional
    public void delete(Long id) {
        if (!typeContractRepository.existsById(id)) {
            throw new RuntimeException("Tipo de contrato no encontrado");
        }
        typeContractRepository.deleteById(id);
    }
}
