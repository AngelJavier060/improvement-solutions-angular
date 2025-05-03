package com.improvementsolutions.controller;

import com.improvementsolutions.model.BusinessEmployeeDocument;
import com.improvementsolutions.service.BusinessEmployeeDocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employee-documents")
@RequiredArgsConstructor
public class BusinessEmployeeDocumentController {

    private final BusinessEmployeeDocumentService documentService;

    @GetMapping("/employee/{businessEmployeeId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<BusinessEmployeeDocument>> getDocumentsByEmployee(@PathVariable Long businessEmployeeId) {
        List<BusinessEmployeeDocument> documents = documentService.findByBusinessEmployeeId(businessEmployeeId);
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<BusinessEmployeeDocument> getDocumentById(@PathVariable Long id) {
        return documentService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/employee/{businessEmployeeId}/type/{typeDocumentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<BusinessEmployeeDocument>> getDocumentsByEmployeeAndType(
            @PathVariable Long businessEmployeeId,
            @PathVariable Long typeDocumentId) {
        List<BusinessEmployeeDocument> documents = documentService.findByBusinessEmployeeIdAndTypeDocumentId(
                businessEmployeeId, typeDocumentId);
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/business/{businessId}/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<List<BusinessEmployeeDocument>> getDocumentsByBusinessAndStatus(
            @PathVariable Long businessId,
            @PathVariable String status) {
        List<BusinessEmployeeDocument> documents = documentService.findByBusinessIdAndStatus(businessId, status);
        return ResponseEntity.ok(documents);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<BusinessEmployeeDocument> createDocument(@RequestBody BusinessEmployeeDocument document) {
        BusinessEmployeeDocument createdDocument = documentService.create(document);
        return new ResponseEntity<>(createdDocument, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<BusinessEmployeeDocument> updateDocument(
            @PathVariable Long id,
            @RequestBody BusinessEmployeeDocument document) {
        BusinessEmployeeDocument updatedDocument = documentService.update(id, document);
        return ResponseEntity.ok(updatedDocument);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        documentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public ResponseEntity<Void> updateDocumentStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        documentService.updateStatus(id, status);
        return ResponseEntity.ok().build();
    }
}