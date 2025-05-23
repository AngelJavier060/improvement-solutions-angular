package com.improvementsolutions.controller;

import com.improvementsolutions.dto.CivilStatusDto;
import com.improvementsolutions.service.CivilStatusService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador público para estados civiles sin autenticación
 * Se eliminó la anotación @CrossOrigin ya que usamos la configuración CORS centralizada
 * IMPORTANTE: No incluir /api/v1 porque ya está configurado en server.servlet.context-path
 */
@RestController
@RequestMapping("/public/estado-civil")
public class PublicCivilStatusController {

    private final CivilStatusService civilStatusService;

    @Autowired
    public PublicCivilStatusController(CivilStatusService civilStatusService) {
        this.civilStatusService = civilStatusService;
    }

    @GetMapping
    public ResponseEntity<List<CivilStatusDto>> getAllCivilStatuses() {
        return ResponseEntity.ok(civilStatusService.getAllCivilStatuses());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CivilStatusDto> getCivilStatusById(@PathVariable Long id) {
        return ResponseEntity.ok(civilStatusService.getCivilStatusById(id));
    }

    @PostMapping
    public ResponseEntity<CivilStatusDto> createCivilStatus(@RequestBody CivilStatusDto civilStatusDto) {
        return new ResponseEntity<>(civilStatusService.createCivilStatus(civilStatusDto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CivilStatusDto> updateCivilStatus(@PathVariable Long id, @RequestBody CivilStatusDto civilStatusDto) {
        return ResponseEntity.ok(civilStatusService.updateCivilStatus(id, civilStatusDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCivilStatus(@PathVariable Long id) {
        civilStatusService.deleteCivilStatus(id);
        return ResponseEntity.noContent().build();
    }
}
