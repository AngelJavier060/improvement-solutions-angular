package com.improvementsolutions.controller;

import com.improvementsolutions.dto.GenderDTO;
import com.improvementsolutions.service.GenderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/generos")  // Ruta corregida sin /api para evitar duplicidad con el context-path
@CrossOrigin(origins = "http://localhost:4200") // Permitir peticiones desde el frontend
public class GenderController {

    private final GenderService genderService;

    @Autowired
    public GenderController(GenderService genderService) {
        this.genderService = genderService;
    }

    @GetMapping
    public ResponseEntity<List<GenderDTO>> getAllGenders() {
        return ResponseEntity.ok(genderService.getAllGenders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenderDTO> getGenderById(@PathVariable Long id) {
        return ResponseEntity.ok(genderService.getGenderById(id));
    }

    @PostMapping
    public ResponseEntity<GenderDTO> createGender(@RequestBody GenderDTO genderDTO) {
        return new ResponseEntity<>(genderService.createGender(genderDTO), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenderDTO> updateGender(@PathVariable Long id, @RequestBody GenderDTO genderDTO) {
        return ResponseEntity.ok(genderService.updateGender(id, genderDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGender(@PathVariable Long id) {
        genderService.deleteGender(id);
        return ResponseEntity.noContent().build();
    }
}