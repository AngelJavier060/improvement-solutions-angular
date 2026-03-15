package com.improvementsolutions.controller;

import com.improvementsolutions.model.WorkSchedule;
import com.improvementsolutions.repository.WorkScheduleRepository;
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
@RequestMapping("/api/master-data/work-schedules")
@RequiredArgsConstructor
public class WorkScheduleController {

    private final WorkScheduleRepository workScheduleRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<List<WorkSchedule>> getAll() {
        return ResponseEntity.ok(workScheduleRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'USER')")
    public ResponseEntity<WorkSchedule> getById(@PathVariable Long id) {
        return workScheduleRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> create(@RequestBody WorkSchedule workSchedule) {
        if (workSchedule.getName() == null || workSchedule.getName().trim().isEmpty()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "El nombre es obligatorio");
            return ResponseEntity.badRequest().body(err);
        }
        if (workScheduleRepository.findByName(workSchedule.getName().trim()).isPresent()) {
            Map<String, String> err = new HashMap<>();
            err.put("message", "Ya existe una jornada de trabajo con ese nombre");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(err);
        }
        workSchedule.setName(workSchedule.getName().trim());
        workSchedule.setCreatedAt(LocalDateTime.now());
        workSchedule.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(workScheduleRepository.save(workSchedule));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody WorkSchedule workSchedule) {
        return workScheduleRepository.findById(id).map(existing -> {
            if (workSchedule.getName() == null || workSchedule.getName().trim().isEmpty()) {
                Map<String, String> err = new HashMap<>();
                err.put("message", "El nombre es obligatorio");
                return ResponseEntity.badRequest().body((Object) err);
            }
            workScheduleRepository.findByName(workSchedule.getName().trim()).ifPresent(dup -> {
                if (!dup.getId().equals(id)) {
                    throw new RuntimeException("Ya existe una jornada con ese nombre");
                }
            });
            existing.setName(workSchedule.getName().trim());
            existing.setDescription(workSchedule.getDescription());
            if (workSchedule.getActive() != null) existing.setActive(workSchedule.getActive());
            existing.setUpdatedAt(LocalDateTime.now());
            return ResponseEntity.ok((Object) workScheduleRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        if (!workScheduleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        workScheduleRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
