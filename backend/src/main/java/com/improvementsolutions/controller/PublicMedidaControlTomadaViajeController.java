package com.improvementsolutions.controller;

import com.improvementsolutions.model.MedidaControlTomadaViaje;
import com.improvementsolutions.repository.MedidaControlTomadaViajeRepository;
import com.improvementsolutions.service.BusinessViajeCatalogJoinCleanupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/medidas-control-tomadas-viaje")
public class PublicMedidaControlTomadaViajeController {

    private final MedidaControlTomadaViajeRepository repository;
    private final BusinessViajeCatalogJoinCleanupService businessViajeCatalogJoinCleanupService;

    @Autowired
    public PublicMedidaControlTomadaViajeController(
            MedidaControlTomadaViajeRepository repository,
            BusinessViajeCatalogJoinCleanupService businessViajeCatalogJoinCleanupService) {
        this.repository = repository;
        this.businessViajeCatalogJoinCleanupService = businessViajeCatalogJoinCleanupService;
    }

    @GetMapping
    public ResponseEntity<List<MedidaControlTomadaViaje>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedidaControlTomadaViaje> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<MedidaControlTomadaViaje> create(@RequestBody MedidaControlTomadaViaje entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedidaControlTomadaViaje> update(@PathVariable Long id, @RequestBody MedidaControlTomadaViaje entity) {
        Optional<MedidaControlTomadaViaje> existing = repository.findById(id);
        if (existing.isPresent()) {
            MedidaControlTomadaViaje toUpdate = existing.get();
            toUpdate.setName(entity.getName());
            toUpdate.setDescription(entity.getDescription());
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
            businessViajeCatalogJoinCleanupService.unlinkMedidaControlTomadaViaje(id);
            repository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }
}
