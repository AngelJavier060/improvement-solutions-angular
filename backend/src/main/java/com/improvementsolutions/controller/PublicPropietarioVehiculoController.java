package com.improvementsolutions.controller;

import com.improvementsolutions.model.PropietarioVehiculo;
import com.improvementsolutions.repository.PropietarioVehiculoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/propietario-vehiculos")
public class PublicPropietarioVehiculoController {

    private final PropietarioVehiculoRepository repository;

    @Autowired
    public PublicPropietarioVehiculoController(PropietarioVehiculoRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<PropietarioVehiculo>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PropietarioVehiculo> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PropietarioVehiculo> create(@RequestBody PropietarioVehiculo entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PropietarioVehiculo> update(@PathVariable Long id, @RequestBody PropietarioVehiculo entity) {
        Optional<PropietarioVehiculo> existing = repository.findById(id);
        if (existing.isPresent()) {
            PropietarioVehiculo toUpdate = existing.get();
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
