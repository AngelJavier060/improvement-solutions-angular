package com.improvementsolutions.controller;

import com.improvementsolutions.model.CondicionClimatica;
import com.improvementsolutions.repository.CondicionClimaticaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/condicion-climaticas")
public class PublicCondicionClimaticaController {

    private final CondicionClimaticaRepository repository;

    @Autowired
    public PublicCondicionClimaticaController(CondicionClimaticaRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<CondicionClimatica>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CondicionClimatica> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<CondicionClimatica> create(@RequestBody CondicionClimatica entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CondicionClimatica> update(@PathVariable Long id, @RequestBody CondicionClimatica entity) {
        Optional<CondicionClimatica> existing = repository.findById(id);
        if (existing.isPresent()) {
            CondicionClimatica toUpdate = existing.get();
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
