package com.improvementsolutions.controller;

import com.improvementsolutions.model.WorkShift;
import com.improvementsolutions.repository.WorkShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/master-data/work-shifts")
@RequiredArgsConstructor
public class WorkShiftController {

    private final WorkShiftRepository workShiftRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<WorkShift>> getAll() {
        return ResponseEntity.ok(workShiftRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<WorkShift> getById(@PathVariable Long id) {
        return workShiftRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> create(@RequestBody WorkShift workShift) {
        if (workShift.getName() == null || workShift.getName().trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "El nombre es obligatorio");
            return ResponseEntity.badRequest().body(err);
        }
        if (workShiftRepository.findByName(workShift.getName().trim()).isPresent()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Ya existe un horario de trabajo con ese nombre");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(err);
        }
        workShift.setName(workShift.getName().trim());
        workShift.setCreatedAt(LocalDateTime.now());
        workShift.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(workShiftRepository.save(workShift));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody WorkShift workShift) {
        return workShiftRepository.findById(id).map(existing -> {
            if (workShift.getName() == null || workShift.getName().trim().isEmpty()) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "El nombre es obligatorio");
                return ResponseEntity.badRequest().body((Object) err);
            }
            workShiftRepository.findByName(workShift.getName().trim()).ifPresent(dup -> {
                if (!dup.getId().equals(id)) {
                    throw new RuntimeException("Ya existe un horario con ese nombre");
                }
            });
            existing.setName(workShift.getName().trim());
            existing.setDescription(workShift.getDescription());
            if (workShift.getActive() != null) existing.setActive(workShift.getActive());
            existing.setUpdatedAt(LocalDateTime.now());
            return ResponseEntity.ok((Object) workShiftRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!workShiftRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        workShiftRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
