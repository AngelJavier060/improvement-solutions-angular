package com.improvementsolutions.service;

import com.improvementsolutions.model.TypeDocument;
import com.improvementsolutions.repository.TypeDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TypeDocumentService {

    private final TypeDocumentRepository typeDocumentRepository;

    public List<TypeDocument> findAll() {
        return typeDocumentRepository.findAll();
    }

    public Optional<TypeDocument> findById(Long id) {
        return typeDocumentRepository.findById(id);
    }

    public Optional<TypeDocument> findByName(String name) {
        return typeDocumentRepository.findByName(name);
    }

    public List<TypeDocument> findByBusinessId(Long businessId) {
        return typeDocumentRepository.findByBusinessId(businessId);
    }

    @Transactional
    public TypeDocument create(TypeDocument typeDocument) {
        if (typeDocumentRepository.findByName(typeDocument.getName()).isPresent()) {
            throw new RuntimeException("Ya existe un tipo de documento con este nombre");
        }
        
        typeDocument.setCreatedAt(LocalDateTime.now());
        typeDocument.setUpdatedAt(LocalDateTime.now());
        
        return typeDocumentRepository.save(typeDocument);
    }

    @Transactional
    public TypeDocument update(Long id, TypeDocument typeDocumentDetails) {
        TypeDocument typeDocument = typeDocumentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tipo de documento no encontrado"));
        
        // Verificar si ya existe otro tipo de documento con el mismo nombre
        Optional<TypeDocument> existingTypeDocument = typeDocumentRepository.findByName(typeDocumentDetails.getName());
        if (existingTypeDocument.isPresent() && !existingTypeDocument.get().getId().equals(id)) {
            throw new RuntimeException("Ya existe un tipo de documento con este nombre");
        }
        
        typeDocument.setName(typeDocumentDetails.getName());
        typeDocument.setDescription(typeDocumentDetails.getDescription());
        typeDocument.setUpdatedAt(LocalDateTime.now());
        
        return typeDocumentRepository.save(typeDocument);
    }

    @Transactional
    public void delete(Long id) {
        if (!typeDocumentRepository.existsById(id)) {
            throw new RuntimeException("Tipo de documento no encontrado");
        }
        typeDocumentRepository.deleteById(id);
    }
}