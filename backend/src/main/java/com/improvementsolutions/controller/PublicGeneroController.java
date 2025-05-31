package com.improvementsolutions.controller;

import com.improvementsolutions.dto.GenderDTO;
import com.improvementsolutions.service.GenderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador público para géneros sin autenticación
 * Se eliminó la anotación @CrossOrigin ya que usamos la configuración CORS centralizada
 */
@RestController
@RequestMapping("/api/public/generos")
public class PublicGeneroController {

    private final GenderService genderService;

    @Autowired
    public PublicGeneroController(GenderService genderService) {
        this.genderService = genderService;
    }

    @GetMapping
    public ResponseEntity<List<GenderDTO>> getAllGeneros() {
        return ResponseEntity.ok(genderService.getAllGenders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenderDTO> getGeneroById(@PathVariable Long id) {
        return ResponseEntity.ok(genderService.getGenderById(id));
    }

    @PostMapping
    public ResponseEntity<GenderDTO> createGenero(@RequestBody GenderDTO genderDTO) {
        return new ResponseEntity<>(genderService.createGender(genderDTO), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenderDTO> updateGenero(@PathVariable Long id, @RequestBody GenderDTO genderDTO) {
        return ResponseEntity.ok(genderService.updateGender(id, genderDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGenero(@PathVariable Long id) {
        genderService.deleteGender(id);
        return ResponseEntity.noContent().build();
    }
}
