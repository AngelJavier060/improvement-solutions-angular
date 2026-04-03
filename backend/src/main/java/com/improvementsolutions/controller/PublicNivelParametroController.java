package com.improvementsolutions.controller;

import com.improvementsolutions.model.NivelParametro;
import com.improvementsolutions.repository.NivelParametroRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/nivel-parametro")
public class PublicNivelParametroController {

    private final NivelParametroRepository repository;

    @Autowired
    public PublicNivelParametroController(NivelParametroRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<NivelParametro>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NivelParametro> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/by-parametro/{parametroId}")
    public ResponseEntity<List<NivelParametro>> getByParametro(@PathVariable Long parametroId) {
        return ResponseEntity.ok(repository.findByParametroMetodologiaIdOrderByValorAsc(parametroId));
    }

    @PostMapping
    public ResponseEntity<NivelParametro> create(@RequestBody NivelParametro entity) {
        entity.setId(null);
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<NivelParametro> update(@PathVariable Long id, @RequestBody NivelParametro entity) {
        Optional<NivelParametro> existing = repository.findById(id);
        if (existing.isPresent()) {
            NivelParametro toUpdate = existing.get();
            toUpdate.setValor(entity.getValor());
            toUpdate.setNombre(entity.getNombre());
            toUpdate.setDescription(entity.getDescription());
            toUpdate.setColor(entity.getColor());
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
