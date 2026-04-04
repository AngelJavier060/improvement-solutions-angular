package com.improvementsolutions.controller;

import com.improvementsolutions.model.NumeroEje;
import com.improvementsolutions.repository.NumeroEjeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/numero-ejes")
@RequiredArgsConstructor
public class PublicNumeroEjeController {

    private final NumeroEjeRepository repository;

    @GetMapping
    public ResponseEntity<List<NumeroEje>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NumeroEje> getById(@PathVariable Long id) {
        Optional<NumeroEje> e = repository.findById(id);
        return e.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<NumeroEje> create(@RequestBody NumeroEje entity) {
        return ResponseEntity.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NumeroEje> update(@PathVariable Long id, @RequestBody NumeroEje entity) {
        Optional<NumeroEje> existing = repository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        NumeroEje toUpdate = existing.get();
        toUpdate.setName(entity.getName());
        toUpdate.setDescription(entity.getDescription());
        return ResponseEntity.ok(repository.save(toUpdate));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
