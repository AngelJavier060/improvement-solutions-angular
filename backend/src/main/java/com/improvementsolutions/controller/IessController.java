package com.improvementsolutions.controller;

import com.improvementsolutions.model.Iess;
import com.improvementsolutions.repository.IessRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/master-data/iess")
@RequiredArgsConstructor
public class IessController {

    private final IessRepository iessRepository;

    @GetMapping
    public ResponseEntity<List<Iess>> getAllIess() {
        return ResponseEntity.ok(iessRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Iess> getIessById(@PathVariable Long id) {
        return iessRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Iess> createIess(@RequestBody Iess iess) {
        if (iessRepository.findByCode(iess.getCode()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        iess.setCreatedAt(LocalDateTime.now());
        iess.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(iessRepository.save(iess));
    }    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Iess> updateIess(@PathVariable Long id, @RequestBody Iess iess) {
        return iessRepository.findById(id)
                .map(existingIess -> {                    Optional<Iess> iessWithSameCode = iessRepository.findByCode(iess.getCode());
                    if (iessWithSameCode.isPresent() && !iessWithSameCode.get().getId().equals(id)) {
                        return ResponseEntity.status(HttpStatus.CONFLICT).<Iess>build();
                    }
                      existingIess.setCode(iess.getCode());
                    existingIess.setDescription(iess.getDescription());
                    existingIess.setUpdatedAt(LocalDateTime.now());
                    return ResponseEntity.ok(iessRepository.save(existingIess));
                })
                .orElse(ResponseEntity.notFound().build());
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> deleteIess(@PathVariable Long id) {
        if (!iessRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        iessRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
