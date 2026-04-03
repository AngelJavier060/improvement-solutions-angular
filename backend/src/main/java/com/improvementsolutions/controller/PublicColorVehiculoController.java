package com.improvementsolutions.controller;

import com.improvementsolutions.model.ColorVehiculo;
import com.improvementsolutions.repository.ColorVehiculoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/color-vehiculos")
public class PublicColorVehiculoController {

    private final ColorVehiculoRepository repository;

    @Autowired
    public PublicColorVehiculoController(ColorVehiculoRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<ColorVehiculo>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ColorVehiculo> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ColorVehiculo> create(@RequestBody ColorVehiculo entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ColorVehiculo> update(@PathVariable Long id, @RequestBody ColorVehiculo entity) {
        Optional<ColorVehiculo> existing = repository.findById(id);
        if (existing.isPresent()) {
            ColorVehiculo toUpdate = existing.get();
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
