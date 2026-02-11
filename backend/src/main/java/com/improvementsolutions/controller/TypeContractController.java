package com.improvementsolutions.controller;

import com.improvementsolutions.model.TypeContract;
import com.improvementsolutions.service.TypeContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/master-data/type-contract")
@RequiredArgsConstructor
public class TypeContractController {

    private final TypeContractService typeContractService;

    @GetMapping
    public ResponseEntity<List<TypeContract>> getAllTypeContracts() {
        return ResponseEntity.ok(typeContractService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TypeContract> getTypeContractById(@PathVariable Long id) {
        return typeContractService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<TypeContract> createTypeContract(@RequestBody TypeContract typeContract) {
        try {
            TypeContract createdTypeContract = typeContractService.create(typeContract);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdTypeContract);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<TypeContract> updateTypeContract(@PathVariable Long id, @RequestBody TypeContract typeContract) {
        try {
            TypeContract updatedTypeContract = typeContractService.update(id, typeContract);
            return ResponseEntity.ok(updatedTypeContract);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("no encontrado")) {
                return ResponseEntity.notFound().build();
            } else {
                return ResponseEntity.status(HttpStatus.CONFLICT).build();
            }
        }
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> deleteTypeContract(@PathVariable Long id) {
        try {
            typeContractService.delete(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
