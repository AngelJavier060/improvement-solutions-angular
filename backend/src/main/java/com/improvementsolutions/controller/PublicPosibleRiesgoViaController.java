package com.improvementsolutions.controller;

import com.improvementsolutions.model.PosibleRiesgoVia;
import com.improvementsolutions.repository.PosibleRiesgoViaRepository;
import com.improvementsolutions.service.BusinessViajeCatalogJoinCleanupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/posibles-riesgos-via")
public class PublicPosibleRiesgoViaController {

    private final PosibleRiesgoViaRepository repository;
    private final BusinessViajeCatalogJoinCleanupService businessViajeCatalogJoinCleanupService;

    @Autowired
    public PublicPosibleRiesgoViaController(
            PosibleRiesgoViaRepository repository,
            BusinessViajeCatalogJoinCleanupService businessViajeCatalogJoinCleanupService) {
        this.repository = repository;
        this.businessViajeCatalogJoinCleanupService = businessViajeCatalogJoinCleanupService;
    }

    @GetMapping
    public ResponseEntity<List<PosibleRiesgoVia>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PosibleRiesgoVia> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PosibleRiesgoVia> create(@RequestBody PosibleRiesgoVia entity) {
        entity.setId(null);
        entity.setMetodologiaRiesgo(null);
        entity.setNeNivel(null);
        entity.setNdNivel(null);
        entity.setNcNivel(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PosibleRiesgoVia> update(@PathVariable Long id, @RequestBody PosibleRiesgoVia entity) {
        Optional<PosibleRiesgoVia> existing = repository.findById(id);
        if (existing.isPresent()) {
            PosibleRiesgoVia toUpdate = existing.get();
            toUpdate.setName(entity.getName());
            toUpdate.setDescription(entity.getDescription());
            toUpdate.setMetodologiaRiesgo(null);
            toUpdate.setNeNivel(null);
            toUpdate.setNdNivel(null);
            toUpdate.setNcNivel(null);
            return ResponseEntity.ok(repository.save(toUpdate));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        try {
            businessViajeCatalogJoinCleanupService.unlinkPosibleRiesgoVia(id);
            repository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }
}
