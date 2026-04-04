package com.improvementsolutions.controller;

import com.improvementsolutions.model.ConfiguracionEje;
import com.improvementsolutions.repository.ConfiguracionEjeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/configuracion-ejes")
@RequiredArgsConstructor
public class PublicConfiguracionEjeController {

    private final ConfiguracionEjeRepository repository;

    @GetMapping
    public ResponseEntity<List<ConfiguracionEje>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConfiguracionEje> getById(@PathVariable Long id) {
        Optional<ConfiguracionEje> e = repository.findById(id);
        return e.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ConfiguracionEje> create(@RequestBody ConfiguracionEje entity) {
        return ResponseEntity.ok(repository.save(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ConfiguracionEje> update(@PathVariable Long id, @RequestBody ConfiguracionEje entity) {
        Optional<ConfiguracionEje> existing = repository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ConfiguracionEje toUpdate = existing.get();
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
