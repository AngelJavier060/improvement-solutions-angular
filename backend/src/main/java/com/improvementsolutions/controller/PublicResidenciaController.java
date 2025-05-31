package com.improvementsolutions.controller;

import com.improvementsolutions.model.ResidentAddress;
import com.improvementsolutions.service.ResidentAddressService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Controlador público para tipos de residencia sin autenticación
 * Se eliminó la anotación @CrossOrigin ya que usamos la configuración CORS centralizada
 */
@RestController
@RequestMapping("/api/public/residencias")
public class PublicResidenciaController {

    private final ResidentAddressService residentAddressService;

    @Autowired
    public PublicResidenciaController(ResidentAddressService residentAddressService) {
        this.residentAddressService = residentAddressService;
    }

    @GetMapping
    public ResponseEntity<List<ResidentAddress>> getAllResidencias() {
        return ResponseEntity.ok(residentAddressService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResidentAddress> getResidenciaById(@PathVariable Long id) {
        Optional<ResidentAddress> residencia = residentAddressService.findById(id);
        return residencia.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ResidentAddress> createResidencia(@RequestBody ResidentAddress residencia) {
        try {
            ResidentAddress nuevaResidencia = residentAddressService.create(residencia);
            return new ResponseEntity<>(nuevaResidencia, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ResidentAddress> updateResidencia(@PathVariable Long id, @RequestBody ResidentAddress residencia) {
        try {
            ResidentAddress residenciaActualizada = residentAddressService.update(id, residencia);
            return ResponseEntity.ok(residenciaActualizada);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResidencia(@PathVariable Long id) {
        try {
            residentAddressService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
