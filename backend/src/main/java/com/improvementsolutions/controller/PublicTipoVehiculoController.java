package com.improvementsolutions.controller;

import com.improvementsolutions.model.TipoVehiculo;
import com.improvementsolutions.model.TipoDocumentoVehiculo;
import com.improvementsolutions.repository.TipoVehiculoRepository;
import com.improvementsolutions.repository.TipoDocumentoVehiculoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;

@RestController
@RequestMapping("/api/public/tipo-vehiculos")
public class PublicTipoVehiculoController {

    private final TipoVehiculoRepository repository;
    private final TipoDocumentoVehiculoRepository documentoRepository;

    @Autowired
    public PublicTipoVehiculoController(
        TipoVehiculoRepository repository,
        TipoDocumentoVehiculoRepository documentoRepository
    ) {
        this.repository = repository;
        this.documentoRepository = documentoRepository;
    }

    @GetMapping
    public ResponseEntity<List<TipoVehiculo>> getAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TipoVehiculo> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<TipoVehiculo> create(@RequestBody Map<String, Object> payload) {
        TipoVehiculo entity = new TipoVehiculo();
        entity.setName((String) payload.get("name"));
        entity.setDescription((String) payload.get("description"));
        
        // Procesar documentIds si existen
        if (payload.containsKey("documentIds") && payload.get("documentIds") != null) {
            @SuppressWarnings("unchecked")
            List<Integer> documentIds = (List<Integer>) payload.get("documentIds");
            Set<TipoDocumentoVehiculo> documentos = new HashSet<>();
            
            for (Integer docId : documentIds) {
                documentoRepository.findById(docId.longValue()).ifPresent(documentos::add);
            }
            entity.setDocumentos(documentos);
        }
        
        return new ResponseEntity<>(repository.save(entity), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TipoVehiculo> update(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Optional<TipoVehiculo> existing = repository.findById(id);
        if (existing.isPresent()) {
            TipoVehiculo toUpdate = existing.get();
            toUpdate.setName((String) payload.get("name"));
            toUpdate.setDescription((String) payload.get("description"));
            
            // Actualizar documentos asociados
            if (payload.containsKey("documentIds")) {
                toUpdate.getDocumentos().clear();
                
                if (payload.get("documentIds") != null) {
                    @SuppressWarnings("unchecked")
                    List<Integer> documentIds = (List<Integer>) payload.get("documentIds");
                    
                    for (Integer docId : documentIds) {
                        documentoRepository.findById(docId.longValue()).ifPresent(toUpdate.getDocumentos()::add);
                    }
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
