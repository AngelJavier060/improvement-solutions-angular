package com.improvementsolutions.service;

import com.improvementsolutions.model.Business;
import com.improvementsolutions.model.BusinessObligationMatrix;
import com.improvementsolutions.repository.BusinessObligationMatrixRepository;
import com.improvementsolutions.repository.BusinessRepository;
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
        Business business = businessRepository.findById(obligationMatrix.getBusiness().getId())
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        obligationMatrix.setBusiness(business);
        obligationMatrix.setStatus("PENDIENTE");
        obligationMatrix.setCreatedAt(LocalDateTime.now());
        obligationMatrix.setUpdatedAt(LocalDateTime.now());

        return obligationMatrixRepository.save(obligationMatrix);
    }

    @Transactional
    public BusinessObligationMatrix update(Long id, BusinessObligationMatrix obligationMatrixDetails) {
        BusinessObligationMatrix obligationMatrix = obligationMatrixRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Matriz de obligaciones no encontrada"));

        obligationMatrix.setObligationMatrix(obligationMatrixDetails.getObligationMatrix());
        obligationMatrix.setName(obligationMatrixDetails.getName());
        obligationMatrix.setDescription(obligationMatrixDetails.getDescription());
        obligationMatrix.setDueDate(obligationMatrixDetails.getDueDate());

        if (obligationMatrixDetails.getStatus() != null) {
            obligationMatrix.setStatus(obligationMatrixDetails.getStatus());
        }

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
}