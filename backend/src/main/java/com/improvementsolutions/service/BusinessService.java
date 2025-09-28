package com.improvementsolutions.service;

import com.improvementsolutions.model.*;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.UserRepository;
import com.improvementsolutions.repository.ObligationMatrixRepository;
import com.improvementsolutions.repository.BusinessObligationMatrixRepository;
import com.improvementsolutions.repository.CourseCertificationRepository;
import com.improvementsolutions.repository.CardCatalogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class BusinessService {
    private static final Logger log = LoggerFactory.getLogger(BusinessService.class);

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;
    private final ObligationMatrixRepository obligationMatrixRepository;
    private final BusinessObligationMatrixRepository businessObligationMatrixRepository;
    private final CourseCertificationRepository courseCertificationRepository;
    private final CardCatalogRepository cardCatalogRepository;
    private final com.improvementsolutions.storage.StorageService storageService;

    public List<Business> findAll() {
        return businessRepository.findAll();
    }

    public Optional<Business> findById(Long id) {
        return businessRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Business> findByIdWithAllRelations(Long id) {
        Optional<Business> businessOpt = businessRepository.findByIdWithAllRelations(id);
        if (businessOpt.isPresent()) {
            Business business = businessOpt.get();
            // Load contractor companies separately to avoid MultipleBagFetchException
            Optional<Business> businessWithContractors = businessRepository.findByIdWithContractorCompanies(id);
            if (businessWithContractors.isPresent()) {
                business.setContractorCompanies(businessWithContractors.get().getContractorCompanies());
            }

            // Load contractor blocks and their contractor company via JOIN FETCH (separate query)
            Optional<Business> businessWithBlocks = businessRepository.findByIdWithContractorBlocksAndCompany(id);
            if (businessWithBlocks.isPresent()) {
                business.setContractorBlocks(businessWithBlocks.get().getContractorBlocks());
            }

            // Initialize lazy collections needed by controller outside of transaction
            try {
                // Basic collections fetched with JOIN FETCH, but force initialization explicitly
                if (business.getDepartments() != null) business.getDepartments().size();
                if (business.getPositions() != null) business.getPositions().size();
                if (business.getTypeDocuments() != null) business.getTypeDocuments().size();
                if (business.getTypeContracts() != null) business.getTypeContracts().size();
                if (business.getCourseCertifications() != null) business.getCourseCertifications().size();
                if (business.getCards() != null) business.getCards().size();
                if (business.getIessItems() != null) business.getIessItems().size();
                if (business.getUsers() != null) business.getUsers().size();
                if (business.getContractorCompanies() != null) business.getContractorCompanies().size();
                // Load obligation matrices and their nested catalog to avoid LazyInitializationException
                java.util.List<BusinessObligationMatrix> bomList = business.getBusinessObligationMatrices();
                if (bomList != null) {
                    bomList.size(); // triggers initialization
                    for (BusinessObligationMatrix bom : bomList) {
                        if (bom != null && bom.getObligationMatrix() != null) {
                            bom.getObligationMatrix().getId(); // initialize nested relation
                        }
                    }
                }
                // Load contractor blocks
                java.util.List<ContractorBlock> blocks = business.getContractorBlocks();
                if (blocks != null) {
                    blocks.size();
                    // Initialize nested contractorCompany for each block to avoid lazy issues during serialization
                    for (ContractorBlock block : blocks) {
                        if (block != null && block.getContractorCompany() != null) {
                            block.getContractorCompany().getId();
                        }
                    }
                }
                // Ensure user roles are initialized to prevent lazy loading during serialization
                if (business.getUsers() != null) {
                    for (User u : business.getUsers()) {
                        if (u != null && u.getRoles() != null) {
                            u.getRoles().size();
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("[BusinessService] Could not initialize obligation matrices for business {}: {}", id, e.getMessage());
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
        if (business.getPhone() == null || business.getPhone().trim().isEmpty()) {
            throw new RuntimeException("El teléfono es requerido");
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
        if (businessDetails.getPhone() == null || businessDetails.getPhone().trim().isEmpty()) {
            throw new RuntimeException("El teléfono es requerido");
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
            String oldLogo = business.getLogo();
            String newLogo = businessDetails.getLogo();
            if (oldLogo != null && !oldLogo.trim().isEmpty() && !oldLogo.equals(newLogo)) {
                try {
                    storageService.delete(oldLogo);
                    log.info("[BusinessService] Deleted old logo file: {}", oldLogo);
                } catch (Exception e) {
                    log.warn("[BusinessService] Could not delete old logo {}: {}", oldLogo, e.getMessage());
                }
            }
            business.setLogo(newLogo);
        }
        
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }

    @Transactional
    public void delete(Long id) {
        log.info("[BusinessService] Deleting business id={} ...", id);
        Business business = businessRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        log.info("[BusinessService] Current relations before cleanup: users={}, departments={}, positions={}, typeDocuments={}, typeContracts={}, courseCertifications={}, cards={}, iessItems={}, contractorCompanies={}, contractorBlocks={}, employees={}, obligationMatrices={}",
                (business.getUsers() == null ? 0 : business.getUsers().size()),
                (business.getDepartments() == null ? 0 : business.getDepartments().size()),
                (business.getPositions() == null ? 0 : business.getPositions().size()),
                (business.getTypeDocuments() == null ? 0 : business.getTypeDocuments().size()),
                (business.getTypeContracts() == null ? 0 : business.getTypeContracts().size()),
                (business.getCourseCertifications() == null ? 0 : business.getCourseCertifications().size()),
                (business.getCards() == null ? 0 : business.getCards().size()),
                (business.getIessItems() == null ? 0 : business.getIessItems().size()),
                (business.getContractorCompanies() == null ? 0 : business.getContractorCompanies().size()),
                (business.getContractorBlocks() == null ? 0 : business.getContractorBlocks().size()),
                (business.getEmployees() == null ? 0 : business.getEmployees().size()),
                (business.getBusinessObligationMatrices() == null ? 0 : business.getBusinessObligationMatrices().size()));

        // Desvincular usuarios (lado inverso)
        if (business.getUsers() != null && !business.getUsers().isEmpty()) {
            // Crear copia para evitar ConcurrentModification
            java.util.Set<com.improvementsolutions.model.User> usersCopy = new java.util.HashSet<>(business.getUsers());
            for (com.improvementsolutions.model.User u : usersCopy) {
                u.getBusinesses().remove(business);
                userRepository.save(u);
            }
            business.getUsers().clear();
        }
        log.info("[BusinessService] Detached users and cleared user links");

        // Limpiar relaciones ManyToMany (tablas intermedias)
        if (business.getDepartments() != null) business.getDepartments().clear();
        if (business.getPositions() != null) business.getPositions().clear();
        if (business.getTypeDocuments() != null) business.getTypeDocuments().clear();
        if (business.getTypeContracts() != null) business.getTypeContracts().clear();
        if (business.getCourseCertifications() != null) business.getCourseCertifications().clear();
        if (business.getCards() != null) business.getCards().clear();
        if (business.getIessItems() != null) business.getIessItems().clear();
        log.info("[BusinessService] Cleared ManyToMany relations (departments, positions, typeDocuments, typeContracts, courseCertifications, cards, iessItems)");

        // Limpiar contratistas y bloques
        business.setContractorCompanies(new java.util.ArrayList<>());
        business.setContractorBlocks(new java.util.ArrayList<>());
        log.info("[BusinessService] Cleared contractor companies and blocks relations");

        // Eliminar empleados (orphanRemoval)
        if (business.getEmployees() != null && !business.getEmployees().isEmpty()) {
            java.util.List<com.improvementsolutions.model.BusinessEmployee> employeesCopy = new java.util.ArrayList<>(business.getEmployees());
            for (com.improvementsolutions.model.BusinessEmployee be : employeesCopy) {
                business.removeEmployee(be);
            }
        }
        log.info("[BusinessService] Removed employees (orphan removal)");

        // Eliminar matrices de obligaciones y sus versiones (evitar FKs)
        try {
            // Primero, eliminar versiones que referencian matrices de esta empresa
            businessObligationMatrixRepository.hardDeleteVersionsByBusinessId(id);
            // Luego, eliminar todas las matrices (activas o inactivas) de esta empresa
            businessObligationMatrixRepository.hardDeleteAllByBusinessId(id);
            // Limpiar colección en memoria para el contexto JPA
            if (business.getBusinessObligationMatrices() != null) {
                business.getBusinessObligationMatrices().clear();
            }
            log.info("[BusinessService] Hard-deleted obligation matrices and versions for business {}", id);
        } catch (Exception e) {
            log.warn("[BusinessService] Could not hard-delete obligation matrices for business {}: {}", id, e.getMessage());
        }

        // Intentar eliminar el archivo de logo asociado si existe
        try {
            String logoPath = business.getLogo();
            if (logoPath != null && !logoPath.trim().isEmpty()) {
                // Acepta tanto "logos/archivo.png" como rutas limpias
                storageService.delete(logoPath);
                log.info("[BusinessService] Deleted logo file: {}", logoPath);
                business.setLogo(null);
            }
        } catch (Exception e) {
            log.warn("[BusinessService] Could not delete business logo for id {}: {}", id, e.getMessage());
        }

        // Persistir la limpieza de relaciones antes de eliminar
        businessRepository.save(business);
        log.info("[BusinessService] Persisted cleanup for business id={}", id);

        // Eliminar la empresa
        businessRepository.delete(business);
        // Forzar sincronización inmediata para observar en logs y consultas subsecuentes
        try {
            businessRepository.flush();
        } catch (Exception e) {
            log.warn("[BusinessService] Flush after delete failed for business {}: {}", id, e.getMessage());
        }

        boolean stillExists = false;
        try {
            stillExists = businessRepository.existsById(id);
        } catch (Exception e) {
            log.warn("[BusinessService] existsById check failed after delete for {}: {}", id, e.getMessage());
        }

        if (stillExists) {
            log.warn("[BusinessService] Business id={} STILL EXISTS after delete attempt", id);
        } else {
            log.info("[BusinessService] Business id={} deleted successfully", id);
        }
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

    // === MÉTODOS PARA CURSOS Y CERTIFICACIONES ===
    @Transactional
    public Business addCourseCertificationToBusiness(Long businessId, Long courseCertificationId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        CourseCertification cc = courseCertificationRepository.findById(courseCertificationId)
                .orElseThrow(() -> new RuntimeException("Curso/Certificación no encontrado"));

        business.getCourseCertifications().add(cc);
        business.setUpdatedAt(LocalDateTime.now());

        return businessRepository.save(business);
    }

    @Transactional
    public void removeCourseCertificationFromBusiness(Long businessId, Long courseCertificationId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        business.getCourseCertifications().removeIf(cc -> cc.getId().equals(courseCertificationId));
        business.setUpdatedAt(LocalDateTime.now());

        businessRepository.save(business);
    }

    // === MÉTODOS PARA TARJETAS ===
    @Transactional
    public Business addCardToBusiness(Long businessId, Long cardId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        CardCatalog card = cardCatalogRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Tarjeta no encontrada"));

        business.getCards().add(card);
        business.setUpdatedAt(LocalDateTime.now());

        return businessRepository.save(business);
    }

    @Transactional
    public void removeCardFromBusiness(Long businessId, Long cardId) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        business.getCards().removeIf(c -> c.getId().equals(cardId));
        business.setUpdatedAt(LocalDateTime.now());

        businessRepository.save(business);
    }

    // === REPLICACIÓN MULTI-EMPRESA ===
    @Transactional
    public void replicateObligationMatrices(Long sourceBusinessId, List<Long> targetBusinessIds) {
        if (targetBusinessIds == null || targetBusinessIds.isEmpty()) {
            throw new RuntimeException("La lista de empresas destino está vacía");
        }

        // Obtener matrices activas de la empresa origen
        List<BusinessObligationMatrix> sourceMatrices = businessObligationMatrixRepository.findByBusinessId(sourceBusinessId);

        for (Long targetId : targetBusinessIds) {
            Business target = businessRepository.findById(targetId)
                    .orElseThrow(() -> new RuntimeException("Empresa destino no encontrada: " + targetId));

            for (BusinessObligationMatrix src : sourceMatrices) {
                Long catalogId = (src.getObligationMatrix() != null) ? src.getObligationMatrix().getId() : null;
                if (catalogId == null) continue;

                // Evitar duplicado activo
                boolean exists = businessObligationMatrixRepository
                        .existsByBusiness_IdAndObligationMatrix_IdAndActiveTrue(targetId, catalogId);
                if (exists) continue;

                BusinessObligationMatrix clone = new BusinessObligationMatrix();
                clone.setBusiness(target);
                clone.setObligationMatrix(src.getObligationMatrix());
                clone.setName(src.getName());
                clone.setDescription(src.getDescription());
                clone.setObligationType(src.getObligationType());
                clone.setDueDate(src.getDueDate());
                clone.setStatus(src.getStatus());
                clone.setPriority(src.getPriority());
                clone.setResponsiblePerson(src.getResponsiblePerson());
                clone.setCompleted(src.isCompleted());
                clone.setCompletionDate(src.getCompletionDate());

                target.addBusinessObligationMatrix(clone);
            }

            target.setUpdatedAt(LocalDateTime.now());
            businessRepository.save(target);
        }
    }

    // === CARGA MASIVA DE MATRICES DE CATÁLOGO A UNA EMPRESA ===
    @Transactional
    public Business addObligationMatricesToBusinessBulk(Long businessId, List<Long> obligationCatalogIds) {
        if (obligationCatalogIds == null || obligationCatalogIds.isEmpty()) {
            return businessRepository.findById(businessId)
                    .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        }

        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        for (Long catalogId : obligationCatalogIds) {
            boolean exists = businessObligationMatrixRepository
                    .existsByBusiness_IdAndObligationMatrix_IdAndActiveTrue(businessId, catalogId);
            if (exists) continue;

            ObligationMatrix obligationMatrix = obligationMatrixRepository.findById(catalogId)
                    .orElseThrow(() -> new RuntimeException("Matriz de obligación no encontrada: " + catalogId));

            BusinessObligationMatrix bom = new BusinessObligationMatrix();
            bom.setBusiness(business);
            bom.setObligationMatrix(obligationMatrix);
            bom.setName(obligationMatrix.getLegalCompliance());
            bom.setDescription(obligationMatrix.getDescription());
            bom.setStatus("PENDIENTE");

            business.addBusinessObligationMatrix(bom);
        }

        business.setUpdatedAt(LocalDateTime.now());
        return businessRepository.save(business);
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
        
        // Evitar duplicados: si ya existe una relación activa para esta matriz en la empresa, no crear otra
        boolean alreadyAssigned = business.getBusinessObligationMatrices().stream()
            .anyMatch(bom -> bom.getObligationMatrix() != null 
                    && obligationMatrixId.equals(bom.getObligationMatrix().getId())
                    && bom.isActive());
        if (alreadyAssigned) {
            // No crear duplicados; devolver el estado actual
            return business;
        }

        // Crear la relación intermedia
        BusinessObligationMatrix businessObligationMatrix = new BusinessObligationMatrix();
        businessObligationMatrix.setBusiness(business);
        businessObligationMatrix.setObligationMatrix(obligationMatrix);
        businessObligationMatrix.setName(obligationMatrix.getLegalCompliance());
        businessObligationMatrix.setDescription(obligationMatrix.getDescription());
        businessObligationMatrix.setStatus("PENDIENTE");
        
        business.addBusinessObligationMatrix(businessObligationMatrix);
        business.setUpdatedAt(LocalDateTime.now());
        
        return businessRepository.save(business);
    }

    @Transactional
    public void removeObligationMatrixFromBusiness(Long businessId, Long obligationMatrixId) {
        // 1) Eliminar físicamente duplicados INACTIVOS para evitar violar el índice único
        businessObligationMatrixRepository.hardDeleteInactiveByBusinessAndCatalog(businessId, obligationMatrixId);

        // 2) Aplicar soft delete al registro ACTIVO correspondiente
        int updated = businessObligationMatrixRepository.softDeleteActiveByBusinessAndCatalog(businessId, obligationMatrixId);
        if (updated == 0) {
            // No había registro activo; no es un error fatal, pero registramos el hecho
            // Puede haber sido ya eliminado previamente
        }

        // 3) Actualizar timestamp de la empresa
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        business.setUpdatedAt(LocalDateTime.now());
        businessRepository.save(business);
    }
}
