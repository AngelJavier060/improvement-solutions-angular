package com.improvementsolutions.service;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

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
        // Validaciones
        if (businessRepository.existsByRuc(business.getRuc())) {
            throw new RuntimeException("RUC ya está registrado");
        }
        
        // Validar campos requeridos
        if (business.getRuc() == null || business.getRuc().trim().isEmpty()) {
            throw new RuntimeException("El RUC es requerido");
        }
        if (business.getName() == null || business.getName().trim().isEmpty()) {
            throw new RuntimeException("El nombre de la empresa es requerido");
        }
        if (business.getLegalRepresentative() == null || business.getLegalRepresentative().trim().isEmpty()) {
            throw new RuntimeException("El representante legal es requerido");
        }
        if (business.getEmail() == null || business.getEmail().trim().isEmpty()) {
            throw new RuntimeException("El email es requerido");
        }
        
        // Establecer valores por defecto
        business.setActive(true);
        business.setRegistrationDate(LocalDateTime.now());
        business.setCreatedAt(LocalDateTime.now());
        business.setUpdatedAt(LocalDateTime.now());
        
        // Si no se proporciona el nombre corto, generarlo del nombre
        if (business.getNameShort() == null || business.getNameShort().trim().isEmpty()) {
            business.setNameShort(business.getName().substring(0, Math.min(business.getName().length(), 50)));
        }
        
        return businessRepository.save(business);
    }

    @Transactional
    public Business update(Long id, Business businessDetails) {
        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        // Validar que si se cambia el RUC, no exista ya
        if (!business.getRuc().equals(businessDetails.getRuc()) && 
                businessRepository.existsByRuc(businessDetails.getRuc())) {
            throw new RuntimeException("RUC ya está registrado");
        }
        
        // Validar campos requeridos
        if (businessDetails.getRuc() == null || businessDetails.getRuc().trim().isEmpty()) {
            throw new RuntimeException("El RUC es requerido");
        }
        if (businessDetails.getName() == null || businessDetails.getName().trim().isEmpty()) {
            throw new RuntimeException("El nombre de la empresa es requerido");
        }
        if (businessDetails.getLegalRepresentative() == null || businessDetails.getLegalRepresentative().trim().isEmpty()) {
            throw new RuntimeException("El representante legal es requerido");
        }
        if (businessDetails.getEmail() == null || businessDetails.getEmail().trim().isEmpty()) {
            throw new RuntimeException("El email es requerido");
        }
        
        // Actualizar los campos
        business.setRuc(businessDetails.getRuc());
        business.setName(businessDetails.getName());
        business.setNameShort(businessDetails.getNameShort() != null ? 
            businessDetails.getNameShort() : 
            businessDetails.getName().substring(0, Math.min(businessDetails.getName().length(), 50)));
        business.setLegalRepresentative(businessDetails.getLegalRepresentative());
        business.setEmail(businessDetails.getEmail());
        business.setAddress(businessDetails.getAddress());
        business.setPhone(businessDetails.getPhone());
        business.setSecondaryPhone(businessDetails.getSecondaryPhone());
        business.setWebsite(businessDetails.getWebsite());
        business.setDescription(businessDetails.getDescription());
        business.setTradeName(businessDetails.getTradeName());
        business.setCommercialActivity(businessDetails.getCommercialActivity());
        
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
    }    @Transactional
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
    
    // Métodos adicionales para el dashboard del administrador
    public Long countActiveBusinesses() {
        return businessRepository.countByActiveTrue();
    }

    public List<Business> findByRegistrationDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return businessRepository.findByRegistrationDateBetween(startDate, endDate);
    }

    public List<Business> findAllActiveBusinesses() {
        return businessRepository.findByActiveTrue();
    }

    public List<Business> searchBusinesses(String term) {
        return businessRepository.findByNameContainingIgnoreCaseOrRucContainingIgnoreCase(term, term);
    }

    @Transactional
    public void toggleBusinessStatus(Long businessId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        business.setActive(!business.isActive());
        business.setUpdatedAt(LocalDateTime.now());
        businessRepository.save(business);
    }
    
    @Transactional
    public Business updateBusinessConfigurations(Long businessId, Set<Department> departments, 
            Set<Iess> iessItems, Set<Position> positions) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        business.setDepartments(departments);
        business.setIessItems(iessItems);
        business.setPositions(positions);
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }
}
