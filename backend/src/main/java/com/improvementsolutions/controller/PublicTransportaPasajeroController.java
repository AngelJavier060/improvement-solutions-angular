package com.improvementsolutions.controller;

import com.improvementsolutions.model.TransportaPasajero;
import com.improvementsolutions.repository.TransportaPasajeroRepository;
import com.improvementsolutions.service.BusinessViajeCatalogJoinCleanupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/transporta-pasajeros")
public class PublicTransportaPasajeroController {

    private final TransportaPasajeroRepository repository;
    private final BusinessViajeCatalogJoinCleanupService businessViajeCatalogJoinCleanupService;

    @Autowired
    public PublicTransportaPasajeroController(
            TransportaPasajeroRepository repository,
            BusinessViajeCatalogJoinCleanupService businessViajeCatalogJoinCleanupService) {
        this.repository = repository;
        this.businessViajeCatalogJoinCleanupService = businessViajeCatalogJoinCleanupService;
    }

    @GetMapping
    public ResponseEntity<List<TransportaPasajero>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransportaPasajero> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TransportaPasajero> create(@RequestBody TransportaPasajero entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TransportaPasajero> update(@PathVariable Long id, @RequestBody TransportaPasajero entity) {
        Optional<TransportaPasajero> existing = repository.findById(id);
        if (existing.isPresent()) {
            TransportaPasajero toUpdate = existing.get();
            toUpdate.setName(entity.getName());
            toUpdate.setDescription(entity.getDescription());
            toUpdate.setMetodologiaRiesgo(entity.getMetodologiaRiesgo());
            toUpdate.setNeNivel(entity.getNeNivel());
            toUpdate.setNdNivel(entity.getNdNivel());
            toUpdate.setNcNivel(entity.getNcNivel());
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
            businessViajeCatalogJoinCleanupService.unlinkTransportaPasajero(id);
            repository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }
}
