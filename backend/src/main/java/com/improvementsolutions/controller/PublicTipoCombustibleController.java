package com.improvementsolutions.controller;

import com.improvementsolutions.model.TipoCombustible;
import com.improvementsolutions.repository.TipoCombustibleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/tipo-combustibles")
public class PublicTipoCombustibleController {

    private final TipoCombustibleRepository repository;

    @Autowired
    public PublicTipoCombustibleController(TipoCombustibleRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<TipoCombustible>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TipoCombustible> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TipoCombustible> create(@RequestBody TipoCombustible entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TipoCombustible> update(@PathVariable Long id, @RequestBody TipoCombustible entity) {
        Optional<TipoCombustible> existing = repository.findById(id);
        if (existing.isPresent()) {
            TipoCombustible toUpdate = existing.get();
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
