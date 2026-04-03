package com.improvementsolutions.controller;

import com.improvementsolutions.model.UbicacionRuta;
import com.improvementsolutions.repository.UbicacionRutaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/ubicacion-rutas")
public class PublicUbicacionRutaController {

    private final UbicacionRutaRepository repository;

    @Autowired
    public PublicUbicacionRutaController(UbicacionRutaRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<UbicacionRuta>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UbicacionRuta> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<UbicacionRuta> create(@RequestBody UbicacionRuta entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UbicacionRuta> update(@PathVariable Long id, @RequestBody UbicacionRuta entity) {
        Optional<UbicacionRuta> existing = repository.findById(id);
        if (existing.isPresent()) {
            UbicacionRuta toUpdate = existing.get();
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
