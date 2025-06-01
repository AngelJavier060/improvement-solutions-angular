package com.improvementsolutions.service;

import com.improvementsolutions.model.Iess;
import com.improvementsolutions.repository.IessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class IessService {

    private final IessRepository iessRepository;

    public List<Iess> findAll() {
        return iessRepository.findAll();
    }

    public Optional<Iess> findById(Long id) {
        return iessRepository.findById(id);
    }    public Optional<Iess> findByCode(String code) {
        return iessRepository.findByCode(code);
    }

    public List<Iess> findByBusinessId(Long businessId) {
        return iessRepository.findByBusinessId(businessId);
    }    @Transactional
    public Iess create(Iess iess) {
        if (iessRepository.findByCode(iess.getCode()).isPresent()) {
            throw new RuntimeException("Ya existe un tipo de IESS con este código sectorial");
        }
        
        iess.setCreatedAt(LocalDateTime.now());
        iess.setUpdatedAt(LocalDateTime.now());
        
        return iessRepository.save(iess);
    }    @Transactional
    public Iess update(Long id, Iess iessDetails) {
        Iess iess = iessRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tipo de IESS no encontrado"));
        
        // Verificar si ya existe otro tipo de IESS con el mismo código
        Optional<Iess> existingIess = iessRepository.findByCode(iessDetails.getCode());
        if (existingIess.isPresent() && !existingIess.get().getId().equals(id)) {
            throw new RuntimeException("Ya existe un tipo de IESS con este código sectorial");
        }
        
        iess.setCode(iessDetails.getCode());
        iess.setDescription(iessDetails.getDescription());
        iess.setUpdatedAt(LocalDateTime.now());
        
        return iessRepository.save(iess);
    }

    @Transactional
    public void delete(Long id) {
        if (!iessRepository.existsById(id)) {
            throw new RuntimeException("Tipo de IESS no encontrado");
        }
        iessRepository.deleteById(id);
    }
}
