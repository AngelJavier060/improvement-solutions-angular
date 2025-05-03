package com.improvementsolutions.service;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.User;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BusinessService {

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;

    public List<Business> findAll() {
        return businessRepository.findAll();
    }

    public Optional<Business> findById(Long id) {
        return businessRepository.findById(id);
    }

    public Optional<Business> findByRuc(String ruc) {
        return businessRepository.findByRuc(ruc);
    }

    public List<Business> findByName(String name) {
        return businessRepository.findByNameContainingIgnoreCase(name);
    }

    public List<Business> findByUserId(Long userId) {
        return businessRepository.findBusinessesByUserId(userId);
    }

    @Transactional
    public Business create(Business business) {
        if (businessRepository.existsByRuc(business.getRuc())) {
            throw new RuntimeException("RUC ya está registrado");
        }
        
        business.setCreatedAt(LocalDateTime.now());
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }

    @Transactional
    public Business update(Long id, Business businessDetails) {
        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        if (!business.getRuc().equals(businessDetails.getRuc()) && 
                businessRepository.existsByRuc(businessDetails.getRuc())) {
            throw new RuntimeException("RUC ya está registrado");
        }
        
        business.setRuc(businessDetails.getRuc());
        business.setName(businessDetails.getName());
        business.setNameShort(businessDetails.getNameShort());
        business.setRepresentativeLegal(businessDetails.getRepresentativeLegal());
        business.setEmail(businessDetails.getEmail());
        business.setAddress(businessDetails.getAddress());
        business.setPhone(businessDetails.getPhone());
        
        // Solo actualiza el logo si se proporciona uno nuevo
        if (businessDetails.getLogo() != null && !businessDetails.getLogo().isEmpty()) {
            business.setLogo(businessDetails.getLogo());
        }
        
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }

    @Transactional
    public void delete(Long id) {
        if (!businessRepository.existsById(id)) {
            throw new RuntimeException("Empresa no encontrada");
        }
        businessRepository.deleteById(id);
    }

    @Transactional
    public void addUserToBusiness(Long businessId, Long userId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        business.getUsers().add(user);
        user.getBusinesses().add(business);
        
        businessRepository.save(business);
        userRepository.save(user);
    }

    @Transactional
    public void removeUserFromBusiness(Long businessId, Long userId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        business.getUsers().remove(user);
        user.getBusinesses().remove(business);
        
        businessRepository.save(business);
        userRepository.save(user);
    }
}