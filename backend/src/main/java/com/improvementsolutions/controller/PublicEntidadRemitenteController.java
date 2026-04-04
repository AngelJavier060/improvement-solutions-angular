package com.improvementsolutions.controller;

import com.improvementsolutions.model.EntidadRemitente;
import com.improvementsolutions.repository.EntidadRemitenteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/entidades-remitente")
public class PublicEntidadRemitenteController {

    private final EntidadRemitenteRepository repository;

    @Autowired
    public PublicEntidadRemitenteController(EntidadRemitenteRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<EntidadRemitente>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EntidadRemitente> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EntidadRemitente> create(@RequestBody EntidadRemitente entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EntidadRemitente> update(@PathVariable Long id, @RequestBody EntidadRemitente entity) {
        Optional<EntidadRemitente> existing = repository.findById(id);
        if (existing.isPresent()) {
            EntidadRemitente toUpdate = existing.get();
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
