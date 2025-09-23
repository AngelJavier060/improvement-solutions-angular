package com.improvementsolutions.service;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.dto.ComplianceSummaryDTO;
import com.improvementsolutions.model.BusinessObligationMatrix;
import com.improvementsolutions.model.BusinessObligationMatrixVersion;
import com.improvementsolutions.model.ObligationMatrix;
import com.improvementsolutions.repository.BusinessObligationMatrixRepository;
import com.improvementsolutions.repository.BusinessObligationMatrixVersionRepository;
import com.improvementsolutions.repository.BusinessRepository;
import com.improvementsolutions.repository.ObligationMatrixRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BusinessObligationMatrixService {

    private final BusinessObligationMatrixRepository obligationMatrixRepository;
    private final BusinessRepository businessRepository;
    private final ObligationMatrixRepository obligationMatrixCatalogRepository;
    private final BusinessObligationMatrixVersionRepository versionRepository;

    public List<BusinessObligationMatrix> findAll() {
        return obligationMatrixRepository.findAll();
    }

    public Optional<BusinessObligationMatrix> findById(Long id) {
        return obligationMatrixRepository.findById(id);
    }

    public List<BusinessObligationMatrix> findByBusinessId(Long businessId) {
        return obligationMatrixRepository.findByBusinessId(businessId);
    }

    public List<BusinessObligationMatrix> findByBusinessIdAndStatus(Long businessId, String status) {
        return obligationMatrixRepository.findByBusinessIdAndStatus(businessId, status);
    }

    public List<BusinessObligationMatrix> findObligationsWithDueDateInRange(Long businessId, LocalDate startDate, LocalDate endDate) {
        return obligationMatrixRepository.findObligationsWithDueDateInRange(businessId, startDate, endDate);
    }

    public List<BusinessObligationMatrix> searchByNameOrDescription(Long businessId, String searchTerm) {
        return obligationMatrixRepository.searchByNameOrDescription(businessId, searchTerm);
    }

    @Transactional
    public BusinessObligationMatrix create(BusinessObligationMatrix obligationMatrix) {
        if (obligationMatrix.getBusiness() == null || obligationMatrix.getBusiness().getId() == null) {
            throw new RuntimeException("Debe especificar la empresa (business.id)");
        }
        if (obligationMatrix.getObligationMatrix() == null || obligationMatrix.getObligationMatrix().getId() == null) {
            throw new RuntimeException("Debe especificar la matriz de obligación (obligationMatrix.id)");
        }

        Long businessId = obligationMatrix.getBusiness().getId();
        Long catalogId = obligationMatrix.getObligationMatrix().getId();

        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        // Evitar duplicados activos
        if (obligationMatrixRepository.existsByBusiness_IdAndObligationMatrix_IdAndActiveTrue(businessId, catalogId)) {
            throw new RuntimeException("La matriz ya está asignada activamente a la empresa");
        }

        obligationMatrix.setBusiness(business);
        if (obligationMatrix.getStatus() == null || obligationMatrix.getStatus().isBlank()) {
            obligationMatrix.setStatus("PENDIENTE");
        }
        obligationMatrix.setCreatedAt(LocalDateTime.now());
        obligationMatrix.setUpdatedAt(LocalDateTime.now());

        return obligationMatrixRepository.save(obligationMatrix);
    }

    @Transactional
    public BusinessObligationMatrix update(Long id, BusinessObligationMatrix obligationMatrixDetails) {
        BusinessObligationMatrix obligationMatrix = obligationMatrixRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Matriz de obligaciones no encontrada"));

        // NO cambiar: obligationMatrix (catálogo)
        // Permitir que ADMIN (a través del controlador) actualice nombre y descripción si vienen presentes
        if (obligationMatrixDetails.getName() != null) {
            obligationMatrix.setName(obligationMatrixDetails.getName());
        }
        if (obligationMatrixDetails.getDescription() != null) {
            obligationMatrix.setDescription(obligationMatrixDetails.getDescription());
        }

        // Actualizar solo campos permitidos si vienen en el payload
        // Permitir actualizar la fecha de ingreso desde la UI de admin
        if (obligationMatrixDetails.getCreatedAt() != null) {
            obligationMatrix.setCreatedAt(obligationMatrixDetails.getCreatedAt());
        }
        if (obligationMatrixDetails.getObservations() != null) {
            obligationMatrix.setObservations(obligationMatrixDetails.getObservations());
        }
        if (obligationMatrixDetails.getObligationType() != null) {
            obligationMatrix.setObligationType(obligationMatrixDetails.getObligationType());
        }
        if (obligationMatrixDetails.getDueDate() != null) {
            obligationMatrix.setDueDate(obligationMatrixDetails.getDueDate());
        }
        if (obligationMatrixDetails.getPriority() != null) {
            obligationMatrix.setPriority(obligationMatrixDetails.getPriority());
        }
        if (obligationMatrixDetails.getResponsiblePerson() != null) {
            obligationMatrix.setResponsiblePerson(obligationMatrixDetails.getResponsiblePerson());
        }
        if (obligationMatrixDetails.getStatus() != null) {
            obligationMatrix.setStatus(obligationMatrixDetails.getStatus());
        }

        // 'completed' y 'completionDate' se gestionan exclusivamente en markCompletion()

        obligationMatrix.setUpdatedAt(LocalDateTime.now());
        return obligationMatrixRepository.save(obligationMatrix);
    }

    @Transactional
    public void delete(Long id) {
        if (!obligationMatrixRepository.existsById(id)) {
            throw new RuntimeException("Matriz de obligaciones no encontrada");
        }
        obligationMatrixRepository.deleteById(id);
    }

    @Transactional
    public void updateStatus(Long id, String status) {
        BusinessObligationMatrix obligationMatrix = obligationMatrixRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Matriz de obligaciones no encontrada"));

        obligationMatrix.setStatus(status);
        obligationMatrix.setUpdatedAt(LocalDateTime.now());

        obligationMatrixRepository.save(obligationMatrix);
    }

    // Crear relación por empresa y catálogo con datos opcionales
    @Transactional
    public BusinessObligationMatrix createForBusinessAndCatalog(Long businessId, Long obligationMatrixId, BusinessObligationMatrix details) {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        ObligationMatrix catalog = obligationMatrixCatalogRepository.findById(obligationMatrixId)
                .orElseThrow(() -> new RuntimeException("Matriz de obligación no encontrada"));

        if (obligationMatrixRepository.existsByBusiness_IdAndObligationMatrix_IdAndActiveTrue(businessId, obligationMatrixId)) {
            throw new RuntimeException("La matriz ya está asignada activamente a la empresa");
        }

        BusinessObligationMatrix entity = new BusinessObligationMatrix();
        entity.setBusiness(business);
        entity.setObligationMatrix(catalog);
        entity.setName(details != null && details.getName() != null ? details.getName() : catalog.getLegalCompliance());
        entity.setDescription(details != null && details.getDescription() != null ? details.getDescription() : catalog.getDescription());
        entity.setObservations(details != null ? details.getObservations() : null);
        entity.setObligationType(details != null ? details.getObligationType() : null);
        entity.setDueDate(details != null ? details.getDueDate() : null);
        entity.setPriority(details != null ? details.getPriority() : null);
        entity.setResponsiblePerson(details != null ? details.getResponsiblePerson() : null);
        entity.setCompleted(details != null && details.isCompleted());
        entity.setCompletionDate(details != null ? details.getCompletionDate() : null);
        entity.setStatus(details != null && details.getStatus() != null ? details.getStatus() : "PENDIENTE");
        entity.setCreatedAt(LocalDateTime.now());
        entity.setUpdatedAt(LocalDateTime.now());

        return obligationMatrixRepository.save(entity);
    }

    // Marcar cumplimiento
    @Transactional
    public void markCompletion(Long id, boolean completed) {
        BusinessObligationMatrix entity = obligationMatrixRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Matriz de obligaciones no encontrada"));
        entity.setCompleted(completed);
        entity.setCompletionDate(completed ? LocalDateTime.now() : null);
        entity.setUpdatedAt(LocalDateTime.now());
        obligationMatrixRepository.save(entity);
    }

    // === Versioning / Renewal ===
    @Transactional
    public BusinessObligationMatrix renew(Long id, BusinessObligationMatrix newDetails) {
        BusinessObligationMatrix current = obligationMatrixRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Matriz de obligaciones no encontrada"));

        // Snapshot current to versions
        BusinessObligationMatrixVersion snapshot = new BusinessObligationMatrixVersion();
        snapshot.setBusinessObligationMatrix(current);
        snapshot.setVersion(current.getCurrentVersion() != null ? current.getCurrentVersion() : 1);
        snapshot.setName(current.getName());
        snapshot.setDescription(current.getDescription());
        snapshot.setObservations(current.getObservations());
        snapshot.setDueDate(current.getDueDate());
        snapshot.setStatus(current.getStatus());
        snapshot.setPriority(current.getPriority());
        snapshot.setResponsiblePerson(current.getResponsiblePerson());
        snapshot.setCompleted(current.isCompleted());
        snapshot.setCompletionDate(current.getCompletionDate());
        snapshot.setEntryDate(current.getCreatedAt());
        snapshot.setCreatedAt(LocalDateTime.now());
        versionRepository.save(snapshot);

        // Increment version and apply new details
        int newVersion = (current.getCurrentVersion() != null ? current.getCurrentVersion() : 1) + 1;
        current.setCurrentVersion(newVersion);

        if (newDetails != null) {
            if (newDetails.getName() != null) current.setName(newDetails.getName());
            if (newDetails.getDescription() != null) current.setDescription(newDetails.getDescription());
            if (newDetails.getObservations() != null) current.setObservations(newDetails.getObservations());
            if (newDetails.getDueDate() != null) current.setDueDate(newDetails.getDueDate());
            if (newDetails.getPriority() != null) current.setPriority(newDetails.getPriority());
            if (newDetails.getResponsiblePerson() != null) current.setResponsiblePerson(newDetails.getResponsiblePerson());
            if (newDetails.getStatus() != null) current.setStatus(newDetails.getStatus());
            if (newDetails.getCreatedAt() != null) current.setCreatedAt(newDetails.getCreatedAt());
        } else {
            // Reset to default status if not provided
            current.setStatus("PENDIENTE");
        }

        // A new version starts as not completed
        current.setCompleted(false);
        current.setCompletionDate(null);
        current.setUpdatedAt(LocalDateTime.now());

        return obligationMatrixRepository.save(current);
    }

    public List<BusinessObligationMatrixVersion> listVersions(Long matrixId) {
        return versionRepository.findByBusinessObligationMatrix_IdOrderByVersionAsc(matrixId);
    }

    // === Compliance summary for gauge chart ===
    public ComplianceSummaryDTO getComplianceSummary(Long businessId) {
        List<BusinessObligationMatrix> list = obligationMatrixRepository.findByBusinessId(businessId);
        int total = list != null ? list.size() : 0;
        int completed = 0;
        if (list != null) {
            for (BusinessObligationMatrix m : list) {
                String st = m.getStatus();
                boolean byStatus = false;
                if (st != null) {
                    String s = st.trim();
                    String su = s.toUpperCase();
                    // Accept CUMPLIDO/CUMPLIDA and small variants containing the root
                    byStatus = su.contains("CUMPLID");
                }
                boolean byFlag = m.isCompleted();
                if (byStatus || byFlag) {
                    completed++;
                }
            }
        }
        double percentage = total > 0 ? (completed * 100.0) / total : 0.0;
        return new ComplianceSummaryDTO(total, completed, percentage);
    }
}
