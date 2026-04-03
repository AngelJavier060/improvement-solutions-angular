package com.improvementsolutions.controller;

import com.improvementsolutions.model.TipoDocumentoVehiculo;
import com.improvementsolutions.repository.TipoDocumentoVehiculoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/tipo-documento-vehiculos")
public class PublicTipoDocumentoVehiculoController {

    private final TipoDocumentoVehiculoRepository repository;

    @Autowired
    public PublicTipoDocumentoVehiculoController(TipoDocumentoVehiculoRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<TipoDocumentoVehiculo>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TipoDocumentoVehiculo> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TipoDocumentoVehiculo> create(@RequestBody TipoDocumentoVehiculo entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TipoDocumentoVehiculo> update(@PathVariable Long id, @RequestBody TipoDocumentoVehiculo entity) {
        Optional<TipoDocumentoVehiculo> existing = repository.findById(id);
        if (existing.isPresent()) {
            TipoDocumentoVehiculo toUpdate = existing.get();
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
