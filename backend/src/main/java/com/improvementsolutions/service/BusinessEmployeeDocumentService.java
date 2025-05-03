package com.improvementsolutions.service;

import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.BusinessEmployeeDocument;
import com.improvementsolutions.repository.BusinessEmployeeDocumentRepository;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BusinessEmployeeDocumentService {

    private final BusinessEmployeeDocumentRepository documentRepository;
    private final BusinessEmployeeRepository businessEmployeeRepository;

    public List<BusinessEmployeeDocument> findAll() {
        return documentRepository.findAll();
    }

    public Optional<BusinessEmployeeDocument> findById(Long id) {
        return documentRepository.findById(id);
    }

    public List<BusinessEmployeeDocument> findByBusinessEmployeeId(Long businessEmployeeId) {
        return documentRepository.findByBusinessEmployeeId(businessEmployeeId);
    }

    public List<BusinessEmployeeDocument> findByBusinessEmployeeIdAndTypeDocumentId(
            Long businessEmployeeId, Long typeDocumentId) {
        return documentRepository.findByBusinessEmployeeIdAndTypeDocumentId(businessEmployeeId, typeDocumentId);
    }

    public List<BusinessEmployeeDocument> findByBusinessIdAndStatus(Long businessId, String status) {
        return documentRepository.findByBusinessIdAndStatus(businessId, status);
    }

    @Transactional
    public BusinessEmployeeDocument create(BusinessEmployeeDocument document) {
        BusinessEmployee businessEmployee = businessEmployeeRepository.findById(document.getBusinessEmployee().getId())
                .orElseThrow(() -> new RuntimeException("Empleado de empresa no encontrado"));

        document.setBusinessEmployee(businessEmployee);
        document.setStatus("ACTIVO");
        document.setCreatedAt(LocalDateTime.now());
        document.setUpdatedAt(LocalDateTime.now());

        return documentRepository.save(document);
    }

    @Transactional
    public BusinessEmployeeDocument update(Long id, BusinessEmployeeDocument documentDetails) {
        BusinessEmployeeDocument document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));

        document.setTypeDocument(documentDetails.getTypeDocument());
        document.setName(documentDetails.getName());
        document.setDescription(documentDetails.getDescription());

        if (documentDetails.getStatus() != null) {
            document.setStatus(documentDetails.getStatus());
        }

        document.setUpdatedAt(LocalDateTime.now());

        return documentRepository.save(document);
    }

    @Transactional
    public void delete(Long id) {
        if (!documentRepository.existsById(id)) {
            throw new RuntimeException("Documento no encontrado");
        }
        documentRepository.deleteById(id);
    }

    @Transactional
    public void updateStatus(Long id, String status) {
        BusinessEmployeeDocument document = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Documento no encontrado"));

        document.setStatus(status);
        document.setUpdatedAt(LocalDateTime.now());

        documentRepository.save(document);
    }
}