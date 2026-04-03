package com.improvementsolutions.controller;

import com.improvementsolutions.model.MedioComunicacion;
import com.improvementsolutions.repository.MedioComunicacionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/medio-comunicaciones")
public class PublicMedioComunicacionController {

    private final MedioComunicacionRepository repository;

    @Autowired
    public PublicMedioComunicacionController(MedioComunicacionRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<MedioComunicacion>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedioComunicacion> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<MedioComunicacion> create(@RequestBody MedioComunicacion entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedioComunicacion> update(@PathVariable Long id, @RequestBody MedioComunicacion entity) {
        Optional<MedioComunicacion> existing = repository.findById(id);
        if (existing.isPresent()) {
            MedioComunicacion toUpdate = existing.get();
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
