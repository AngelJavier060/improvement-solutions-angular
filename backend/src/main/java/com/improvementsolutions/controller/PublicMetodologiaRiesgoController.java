package com.improvementsolutions.controller;

import com.improvementsolutions.model.MetodologiaRiesgo;
import com.improvementsolutions.model.ParametroMetodologia;
import com.improvementsolutions.model.NivelParametro;
import com.improvementsolutions.repository.MetodologiaRiesgoRepository;
import com.improvementsolutions.service.MetodologiaRiesgoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/public/metodologia-riesgo")
public class PublicMetodologiaRiesgoController {

    private static final Logger log = LoggerFactory.getLogger(PublicMetodologiaRiesgoController.class);

    private final MetodologiaRiesgoRepository repository;
    private final MetodologiaRiesgoService service;

    @Autowired
    public PublicMetodologiaRiesgoController(MetodologiaRiesgoRepository repository, MetodologiaRiesgoService service) {
        this.repository = repository;
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<MetodologiaRiesgo>> getAll() {
        return ResponseEntity.ok(service.listAllForPublic());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MetodologiaRiesgo> getById(@PathVariable Long id) {
        return service.getByIdForPublic(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody MetodologiaRiesgo entity) {
        // Verificar nombre duplicado
        Optional<MetodologiaRiesgo> existing = repository.findByName(entity.getName());
        if (existing.isPresent()) {
            log.warn("Intento de crear metodología con nombre duplicado: {}", entity.getName());
            Map<String, String> error = new HashMap<>();
            error.put("title", "Nombre duplicado");
            error.put("message", "Ya existe una metodología con el nombre \"" + entity.getName() +
                    "\". Elija un nombre diferente o edite la existente.");
            error.put("code", "DUPLICATE_NAME");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }

        entity.setId(null);
        if (entity.getParametros() != null) {
            for (ParametroMetodologia param : entity.getParametros()) {
                param.setId(null);
                param.setMetodologiaRiesgo(entity);
                if (param.getNiveles() != null) {
                    for (NivelParametro nivel : param.getNiveles()) {
                        nivel.setId(null);
                        nivel.setParametroMetodologia(param);
                    }
                }
            }
        }

        log.info("Creando metodología: {} con {} parámetros",
                entity.getName(),
                entity.getParametros() != null ? entity.getParametros().size() : 0);

        MetodologiaRiesgo saved = repository.save(entity);
        log.info("Metodología creada con ID: {}", saved.getId());
        return new ResponseEntity<>(saved, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody MetodologiaRiesgo entity) {
        Optional<MetodologiaRiesgo> existingOpt = repository.findByIdWithParametrosAndNiveles(id);
        if (!existingOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }

        // Verificar nombre duplicado en otro registro
        Optional<MetodologiaRiesgo> byName = repository.findByName(entity.getName());
        if (byName.isPresent() && !byName.get().getId().equals(id)) {
            Map<String, String> error = new HashMap<>();
            error.put("title", "Nombre duplicado");
            error.put("message", "Ya existe otra metodología con el nombre \"" + entity.getName() + "\".");
            error.put("code", "DUPLICATE_NAME");
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
        }

        MetodologiaRiesgo toUpdate = existingOpt.get();
        toUpdate.setName(entity.getName());
        toUpdate.setDescription(entity.getDescription());

        // Estrategia segura: limpiar la lista interna y reasignar
        toUpdate.getParametros().clear();
        repository.save(toUpdate); // Forzar flush del clear antes de agregar nuevos

        if (entity.getParametros() != null) {
            for (ParametroMetodologia param : entity.getParametros()) {
                param.setId(null); // Siempre insertar como nuevos para evitar duplicados de clave
                param.setMetodologiaRiesgo(toUpdate);
                if (param.getNiveles() != null) {
                    for (NivelParametro nivel : param.getNiveles()) {
                        nivel.setId(null);
                        nivel.setParametroMetodologia(param);
                    }
                }
                toUpdate.getParametros().add(param);
            }
        }

        log.info("Actualizando metodología ID {} con {} parámetros",
                id, toUpdate.getParametros().size());

        return ResponseEntity.ok(repository.save(toUpdate));
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
            log.error("Error al eliminar metodología ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }
}
