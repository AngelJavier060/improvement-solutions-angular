package com.improvementsolutions.controller;

import com.improvementsolutions.model.Etnia;
import com.improvementsolutions.repository.EthniaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Controlador público para etnias sin autenticación
 * Se eliminó la anotación @CrossOrigin ya que usamos la configuración CORS centralizada
 */
@RestController
@RequestMapping("/api/public/etnias")
public class PublicEtniaController {

    private final EthniaRepository ethniaRepository;

    @Autowired
    public PublicEtniaController(EthniaRepository ethniaRepository) {
        this.ethniaRepository = ethniaRepository;
    }

    @GetMapping
    public ResponseEntity<List<Etnia>> getAllEtnias() {
        List<Etnia> etnias = ethniaRepository.findAll();
        return ResponseEntity.ok(etnias);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Etnia> getEtniaById(@PathVariable Long id) {
        Optional<Etnia> etnia = ethniaRepository.findById(id);
        return etnia.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Etnia> createEtnia(@RequestBody Etnia etnia) {
        // Establecer fechas de creación y actualización
        etnia.setCreatedAt(LocalDateTime.now());
        etnia.setUpdatedAt(LocalDateTime.now());
        
        // Asegurarse de que no tenga un ID establecido
        etnia.setId(null);
        
        // Inicializar la colección para evitar problemas de nullpointer
        etnia.setBusinessEmployees(null);
        
        Etnia nuevaEtnia = ethniaRepository.save(etnia);
        return new ResponseEntity<>(nuevaEtnia, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Etnia> updateEtnia(@PathVariable Long id, @RequestBody Etnia etnia) {
        if (!ethniaRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        // Obtener la entidad existente para preservar relaciones
        Optional<Etnia> existingEtnia = ethniaRepository.findById(id);
        if (existingEtnia.isPresent()) {
            Etnia etniaToUpdate = existingEtnia.get();
            
            // Actualizar solo los campos editables
            etniaToUpdate.setName(etnia.getName());
            etniaToUpdate.setDescription(etnia.getDescription());
            etniaToUpdate.setUpdatedAt(LocalDateTime.now());
            
            Etnia etniaActualizada = ethniaRepository.save(etniaToUpdate);
            return ResponseEntity.ok(etniaActualizada);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEtnia(@PathVariable Long id) {
        if (!ethniaRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        try {
            ethniaRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            // Capturar posible error por relaciones
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }
}
