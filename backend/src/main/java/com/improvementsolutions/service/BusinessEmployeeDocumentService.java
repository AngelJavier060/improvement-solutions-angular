package com.improvementsolutions.service;

import com.improvementsolutions.dto.EmployeeDocumentResponse;
import com.improvementsolutions.model.BusinessEmployee;
import com.improvementsolutions.model.BusinessEmployeeDocument;
import com.improvementsolutions.model.BusinessEmployeeDocumentFile;
import com.improvementsolutions.model.TypeDocument;
import com.improvementsolutions.repository.BusinessEmployeeDocumentRepository;
import com.improvementsolutions.repository.BusinessEmployeeRepository;
import com.improvementsolutions.repository.TypeDocumentRepository;
import com.improvementsolutions.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BusinessEmployeeDocumentService {

    private final BusinessEmployeeDocumentRepository documentRepository;
    private final BusinessEmployeeRepository businessEmployeeRepository;
    private final TypeDocumentRepository typeDocumentRepository;
    private final StorageService storageService;

    @Transactional(readOnly = true)
    public List<EmployeeDocumentResponse> getByEmployeeCedula(String cedula, boolean includeHistory) {
        List<BusinessEmployeeDocument> docs = documentRepository.findByEmployeeCedula(cedula);
        return docs.stream()
                .filter(d -> includeHistory || d.getActive() == null || Boolean.TRUE.equals(d.getActive()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Backward compatible overload
    @Transactional(readOnly = true)
    public List<EmployeeDocumentResponse> getByEmployeeCedula(String cedula) {
        return getByEmployeeCedula(cedula, false);
    }

    @Transactional(readOnly = true)
    public List<EmployeeDocumentResponse> getByBusinessEmployeeId(Long businessEmployeeId, boolean includeHistory) {
        List<BusinessEmployeeDocument> docs = documentRepository.findByBusinessEmployeeId(businessEmployeeId);
        return docs.stream()
                .filter(d -> includeHistory || d.getActive() == null || Boolean.TRUE.equals(d.getActive()))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // Backward compatible overload
    @Transactional(readOnly = true)
    public List<EmployeeDocumentResponse> getByBusinessEmployeeId(Long businessEmployeeId) {
        return getByBusinessEmployeeId(businessEmployeeId, false);
    }

    @Transactional
    public EmployeeDocumentResponse create(Long businessEmployeeId,
                                           Long typeDocumentId,
                                           LocalDate startDate,
                                           LocalDate endDate,
                                           String description,
                                           List<MultipartFile> files) {
        BusinessEmployee be = businessEmployeeRepository.findById(businessEmployeeId)
                .orElseThrow(() -> new IllegalArgumentException("BusinessEmployee no encontrado: " + businessEmployeeId));
        TypeDocument td = typeDocumentRepository.findById(typeDocumentId)
                .orElseThrow(() -> new IllegalArgumentException("Tipo de documento no encontrado: " + typeDocumentId));

        // Desactivar anteriores activos del mismo tipo para mantener histórico
        List<BusinessEmployeeDocument> prevActives = documentRepository
                .findByBusinessEmployeeIdAndTypeDocumentIdAndActiveTrue(be.getId(), td.getId());
        if (prevActives != null && !prevActives.isEmpty()) {
            for (var p : prevActives) { p.setActive(false); }
            documentRepository.saveAll(prevActives);
        }

        BusinessEmployeeDocument doc = new BusinessEmployeeDocument();
        doc.setBusinessEmployee(be);
        doc.setTypeDocument(td);
        doc.setStartDate(startDate);
        doc.setEndDate(endDate);
        doc.setObservations(description);
        doc = documentRepository.save(doc);

        if (files != null) {
            for (MultipartFile f : files) {
                if (f != null && !f.isEmpty()) {
                    String storedPath = storeFile("employee-docs", f); // e.g., employee-docs/uuid.pdf
                    BusinessEmployeeDocumentFile ff = new BusinessEmployeeDocumentFile();
                    ff.setDocument(doc);
                    ff.setFilePath(storedPath);
                    // Compatibilidad: algunas bases de datos tienen columna 'file' NOT NULL
                    ff.setFile(storedPath);
                    ff.setFileName(f.getOriginalFilename());
                    ff.setFileType(f.getContentType());
                    // Compatibilidad: algunas bases de datos tienen columna 'name' NOT NULL
                    String n = f.getOriginalFilename();
                    if (n == null || n.isBlank()) {
                        n = storedPath;
                        int idx = n != null ? n.lastIndexOf('/') : -1;
                        if (idx >= 0 && idx < n.length() - 1) {
                            n = n.substring(idx + 1);
                        }
                    }
                    if (n == null || n.isBlank()) {
                        n = "document-file";
                    }
                    ff.setName(n);
                    doc.getFiles().add(ff);
                }
            }
        }

        doc = documentRepository.save(doc);
        return toResponse(doc);
    }

    @Transactional
    public void delete(Long id) {
        if (!documentRepository.existsById(id)) {
            throw new IllegalArgumentException("Documento no encontrado: " + id);
        }
        documentRepository.deleteById(id);
    }

    private String storeFile(String directory, MultipartFile file) {
        try {
            String originalFilename = file.getOriginalFilename();
            String ext = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                ext = originalFilename.substring(originalFilename.lastIndexOf('.'));
            }
            String unique = java.util.UUID.randomUUID().toString() + ext;
            String stored = storageService.store(directory, file, unique);
            // Devolver la ruta relativa (ej: employee-docs/uuid.pdf). El controlador público sirve en /api/files/{stored}
            return stored;
        } catch (Exception e) {
            log.error("Error almacenando archivo de documento: {}", e.getMessage());
            throw new RuntimeException("No se pudo almacenar el archivo: " + e.getMessage());
        }
    }

    private EmployeeDocumentResponse toResponse(BusinessEmployeeDocument d) {
        EmployeeDocumentResponse resp = new EmployeeDocumentResponse();
        resp.setId(d.getId());
        resp.setBusiness_employee_id(d.getBusinessEmployee().getId());
        EmployeeDocumentResponse.TypeDocumentRef td = new EmployeeDocumentResponse.TypeDocumentRef(
                d.getTypeDocument().getId(),
                d.getTypeDocument().getName()
        );
        resp.setType_document(td);
        resp.setStart_date(d.getStartDate());
        resp.setEnd_date(d.getEndDate());
        resp.setDescription(d.getObservations());
        resp.setActive(d.getActive());
        List<EmployeeDocumentResponse.DocumentFileResponse> files = new ArrayList<>();
        if (d.getFiles() != null) {
            for (var f : d.getFiles()) {
                String rel = f.getFilePath(); // e.g., employee-docs/uuid.pdf
                String dir = rel;
                String name = rel;
                int idx = rel.lastIndexOf('/');
                if (idx > 0) {
                    dir = rel.substring(0, idx);
                    name = rel.substring(idx + 1);
                } else {
                    dir = "";
                    name = rel;
                }
                String publicUrl = "/api/files/" + (dir.isEmpty() ? name : ("download/" + dir + "/" + name));
                files.add(new EmployeeDocumentResponse.DocumentFileResponse(
                        f.getId(),
                        publicUrl,
                        f.getFileName(),
                        f.getFileType()
                ));
            }
        }
        resp.setFiles(files);
        return resp;
    }
}
