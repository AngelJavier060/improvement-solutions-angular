package com.improvementsolutions.controller;

import com.improvementsolutions.model.UnidadMedida;
import com.improvementsolutions.repository.UnidadMedidaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/unidad-medidas")
public class PublicUnidadMedidaController {

    private final UnidadMedidaRepository repository;

    @Autowired
    public PublicUnidadMedidaController(UnidadMedidaRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<UnidadMedida>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UnidadMedida> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UnidadMedida> create(@RequestBody UnidadMedida entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UnidadMedida> update(@PathVariable Long id, @RequestBody UnidadMedida entity) {
        Optional<UnidadMedida> existing = repository.findById(id);
        if (existing.isPresent()) {
            UnidadMedida toUpdate = existing.get();
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
