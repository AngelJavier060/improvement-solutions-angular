package com.improvementsolutions.controller;

import com.improvementsolutions.model.NivelParametro;
import com.improvementsolutions.model.ParametroMetodologia;
import com.improvementsolutions.repository.MetodologiaRiesgoRepository;
import com.improvementsolutions.repository.ParametroMetodologiaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/parametro-metodologia")
public class PublicParametroMetodologiaController {

    private final ParametroMetodologiaRepository repository;
    private final MetodologiaRiesgoRepository metodologiaRepository;

    @Autowired
    public PublicParametroMetodologiaController(ParametroMetodologiaRepository repository,
                                                 MetodologiaRiesgoRepository metodologiaRepository) {
        this.repository = repository;
        this.metodologiaRepository = metodologiaRepository;
    }

    @GetMapping
    public ResponseEntity<List<ParametroMetodologia>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ParametroMetodologia> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/by-metodologia/{metodologiaId}")
    public ResponseEntity<List<ParametroMetodologia>> getByMetodologia(@PathVariable Long metodologiaId) {
        return ResponseEntity.ok(repository.findByMetodologiaRiesgoIdOrderByDisplayOrderAsc(metodologiaId));
    }

    @PostMapping
    public ResponseEntity<ParametroMetodologia> create(@RequestBody ParametroMetodologia entity) {
        entity.setId(null);
        if (entity.getNiveles() != null) {
            for (NivelParametro nivel : entity.getNiveles()) {
                nivel.setId(null);
                nivel.setParametroMetodologia(entity);
            }
        }
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ParametroMetodologia> update(@PathVariable Long id, @RequestBody ParametroMetodologia entity) {
        Optional<ParametroMetodologia> existing = repository.findById(id);
        if (existing.isPresent()) {
            ParametroMetodologia toUpdate = existing.get();
            toUpdate.setCode(entity.getCode());
            toUpdate.setName(entity.getName());
            toUpdate.setDescription(entity.getDescription());
            toUpdate.setDisplayOrder(entity.getDisplayOrder());
            toUpdate.setIsCalculated(entity.getIsCalculated());
            toUpdate.setFormula(entity.getFormula());
            toUpdate.setTipUso(entity.getTipUso());
            toUpdate.setSourceEntity(entity.getSourceEntity());
            toUpdate.setSourceEntityLabel(entity.getSourceEntityLabel());

            toUpdate.getNiveles().clear();
            if (entity.getNiveles() != null) {
                for (NivelParametro nivel : entity.getNiveles()) {
                    nivel.setParametroMetodologia(toUpdate);
                    toUpdate.getNiveles().add(nivel);
                }
            }
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
