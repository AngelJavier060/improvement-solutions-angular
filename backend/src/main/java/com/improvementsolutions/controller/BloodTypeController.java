package com.improvementsolutions.controller;

import com.improvementsolutions.model.BloodType;
import com.improvementsolutions.repository.BloodTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/master-data/blood-types")
@RequiredArgsConstructor
public class BloodTypeController {

    private final BloodTypeRepository bloodTypeRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER', 'MANAGER')")
    public ResponseEntity<List<BloodType>> getAll() {
        return ResponseEntity.ok(bloodTypeRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> create(@RequestBody BloodType bloodType) {
        if (bloodType.getName() == null || bloodType.getName().trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "El nombre es obligatorio");
            return ResponseEntity.badRequest().body(err);
        }
        String name = bloodType.getName().trim();
        if (bloodTypeRepository.findByName(name).isPresent()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Ya existe un tipo de sangre con ese nombre");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(err);
        }
        bloodType.setName(name);
        bloodType.setCreatedAt(LocalDateTime.now());
        bloodType.setUpdatedAt(LocalDateTime.now());
        if (bloodType.getActive() == null) bloodType.setActive(true);
        return ResponseEntity.status(HttpStatus.CREATED).body(bloodTypeRepository.save(bloodType));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody BloodType bloodType) {
        return bloodTypeRepository.findById(id).map(existing -> {
            if (bloodType.getName() == null || bloodType.getName().trim().isEmpty()) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "El nombre es obligatorio");
                return ResponseEntity.badRequest().body((Object) err);
            }
            String name = bloodType.getName().trim();
            bloodTypeRepository.findByName(name).ifPresent(dup -> {
                if (!dup.getId().equals(id)) {
                    throw new RuntimeException("Ya existe un tipo de sangre con ese nombre");
                }
            });
            existing.setName(name);
            existing.setDescription(bloodType.getDescription());
            if (bloodType.getActive() != null) existing.setActive(bloodType.getActive());
            existing.setUpdatedAt(LocalDateTime.now());
            return ResponseEntity.ok((Object) bloodTypeRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!bloodTypeRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        bloodTypeRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
