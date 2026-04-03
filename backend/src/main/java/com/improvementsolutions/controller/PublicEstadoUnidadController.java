package com.improvementsolutions.controller;

import com.improvementsolutions.model.EstadoUnidad;
import com.improvementsolutions.repository.EstadoUnidadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/estado-unidades")
public class PublicEstadoUnidadController {

    private final EstadoUnidadRepository repository;

    @Autowired
    public PublicEstadoUnidadController(EstadoUnidadRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<EstadoUnidad>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EstadoUnidad> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EstadoUnidad> create(@RequestBody EstadoUnidad entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EstadoUnidad> update(@PathVariable Long id, @RequestBody EstadoUnidad entity) {
        Optional<EstadoUnidad> existing = repository.findById(id);
        if (existing.isPresent()) {
            EstadoUnidad toUpdate = existing.get();
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
            repository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }
}
