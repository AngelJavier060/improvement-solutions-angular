package com.improvementsolutions.service;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.repository.ObligationMatrixRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BusinessService {

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final ObligationMatrixRepository obligationMatrixRepository;

    public List<Business> findAll() {
        return businessRepository.findAll();
    }

    public Optional<Business> findById(Long id) {
        return businessRepository.findById(id);
    }

    public Optional<Business> findByIdWithAllRelations(Long id) {
        Optional<Business> businessOpt = businessRepository.findByIdWithAllRelations(id);
        if (businessOpt.isPresent()) {
            Business business = businessOpt.get();
            // Load contractor companies separately to avoid MultipleBagFetchException
            Optional<Business> businessWithContractors = businessRepository.findByIdWithContractorCompanies(id);
            if (businessWithContractors.isPresent()) {
                business.setContractorCompanies(businessWithContractors.get().getContractorCompanies());
            }
        }
        return businessOpt;
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

    @Transactional
    public Business updateBusinessConfigurations(Long businessId, Set<Department> departments, 
            Set<Iess> iessItems, Set<Position> positions, ContractorCompany contractorCompany, 
            List<ContractorBlock> contractorBlocks) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        if (departments != null) business.setDepartments(departments);
        if (iessItems != null) business.setIessItems(iessItems);
        if (positions != null) business.setPositions(positions);
        
        // Compatibilidad hacia atrás: convertir una empresa contratista a lista
        if (contractorCompany != null) {
            business.setContractorCompanies(new ArrayList<>());
            business.getContractorCompanies().add(contractorCompany);
        }
        
        if (contractorBlocks != null) business.setContractorBlocks(contractorBlocks);
        
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }
    
    @Transactional
    public Business updateBusinessConfigurations(Long businessId, Set<Department> departments, 
            Set<Iess> iessItems, Set<Position> positions, List<ContractorCompany> contractorCompanies, 
            List<ContractorBlock> contractorBlocks) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        if (departments != null) business.setDepartments(departments);
        if (iessItems != null) business.setIessItems(iessItems);
        if (positions != null) business.setPositions(positions);
        if (contractorCompanies != null) business.setContractorCompanies(contractorCompanies);
        if (contractorBlocks != null) business.setContractorBlocks(contractorBlocks);
        
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // === MÉTODOS PARA DEPARTAMENTOS ===
    @Transactional
    public Business addDepartmentToBusiness(Long businessId, Long departmentId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        // Buscar el departamento por ID (asumiendo que tienes un DepartmentRepository)
        // Por ahora, crearemos una lógica básica
        Department department = new Department();
        department.setId(departmentId);
        
        business.getDepartments().add(department);
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }

    @Transactional
    public void removeDepartmentFromBusiness(Long businessId, Long departmentId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        business.getDepartments().removeIf(dept -> dept.getId().equals(departmentId));
        business.setUpdatedAt(LocalDateTime.now());
        
        businessRepository.save(business);
    }

    // === MÉTODOS PARA CARGOS ===
    @Transactional
    public Business addPositionToBusiness(Long businessId, Long positionId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        Position position = new Position();
        position.setId(positionId);
        
        business.getPositions().add(position);
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }

    @Transactional
    public void removePositionFromBusiness(Long businessId, Long positionId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        business.getPositions().removeIf(pos -> pos.getId().equals(positionId));
        business.setUpdatedAt(LocalDateTime.now());
        
        businessRepository.save(business);
    }

    // === MÉTODOS PARA TIPOS DE DOCUMENTO ===
    @Transactional
    public Business addTypeDocumentToBusiness(Long businessId, Long typeDocumentId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        TypeDocument typeDocument = new TypeDocument();
        typeDocument.setId(typeDocumentId);
        
        business.getTypeDocuments().add(typeDocument);
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }

    @Transactional
    public void removeTypeDocumentFromBusiness(Long businessId, Long typeDocumentId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        business.getTypeDocuments().removeIf(typeDoc -> typeDoc.getId().equals(typeDocumentId));
        business.setUpdatedAt(LocalDateTime.now());
        
        businessRepository.save(business);
    }

    // === MÉTODOS PARA TIPOS DE CONTRATO ===
    @Transactional
    public Business addTypeContractToBusiness(Long businessId, Long typeContractId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        TypeContract typeContract = new TypeContract();
        typeContract.setId(typeContractId);
        
        business.getTypeContracts().add(typeContract);
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }

    @Transactional
    public void removeTypeContractFromBusiness(Long businessId, Long typeContractId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        business.getTypeContracts().removeIf(typeCont -> typeCont.getId().equals(typeContractId));
        business.setUpdatedAt(LocalDateTime.now());
        
        businessRepository.save(business);
    }

    // === MÉTODOS PARA MATRICES DE OBLIGACIONES ===
    @Transactional
    public Business addObligationMatrixToBusiness(Long businessId, Long obligationMatrixId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        ObligationMatrix obligationMatrix = obligationMatrixRepository.findById(obligationMatrixId)
                .orElseThrow(() -> new RuntimeException("Matriz de obligación no encontrada"));
        
        // Crear la relación intermedia
        BusinessObligationMatrix businessObligationMatrix = new BusinessObligationMatrix();
        businessObligationMatrix.setBusiness(business);
        businessObligationMatrix.setObligationMatrix(obligationMatrix);
        businessObligationMatrix.setName(obligationMatrix.getLegalCompliance());
        businessObligationMatrix.setDescription(obligationMatrix.getDescription());
        businessObligationMatrix.setStatus("PENDING");
        
        business.addBusinessObligationMatrix(businessObligationMatrix);
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }

    @Transactional
    public void removeObligationMatrixFromBusiness(Long businessId, Long obligationMatrixId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        
        business.getBusinessObligationMatrices().removeIf(bom -> 
            bom.getObligationMatrix().getId().equals(obligationMatrixId));
        business.setUpdatedAt(LocalDateTime.now());
        
        businessRepository.save(business);
    }
}
